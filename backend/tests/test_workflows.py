from concurrent.futures import ThreadPoolExecutor

import pytest
from app import tools
from app.database import make_engine
from app.models import (
    ActionLedgerEntry,
    Approval,
    FamilyDelivery,
    HomeEvent,
    ProposedAction,
    RoutineTask,
    Workflow,
)
from app.repository import tasks_today
from app.schemas import ChatIn
from app.seed import seed
from app.services import decide_action
from app.tools import invoke
from app.workflow import run_workflow
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


def create_plan(client, scenario="normal"):
    response = client.post(
        "/api/chat",
        json={
            "message": "Prepare my father's evening routine and prepare a family update",
            "scenario": scenario,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_schedule_and_dashboard(client):
    assert client.get("/api/health").json()["provider"] == "deterministic local engine"
    data = client.get("/api/dashboard").json()
    assert (data["total"], data["completed"], data["pending"]) == (6, 2, 4)
    assert len(client.get("/api/routines/today").json()[0]["tasks"]) == 6
    assert all(e["simulated"] for e in client.get("/api/events").json())


def test_ordering_and_evidence(client):
    workflow = create_plan(client)
    assert [s["tool_name"] for s in workflow["steps"]] == [
        "get_today_schedule",
        "inspect_simulated_home_events",
        "get_pending_tasks",
        "create_prioritized_plan",
        "prepare_family_update",
        "create_approval_request",
    ]
    assert workflow["response"]["plan"][0]["title"] == "Evening check-in"
    assert workflow["response"]["plan"][0]["evidence"][0]["id"] == 4
    assert workflow["status"] == "awaiting_approval"
    action = client.get("/api/actions").json()[0]
    assert action["status"] == "awaiting_approval"
    assert action["result"] is None
    assert action["external_state"] is False


def test_approve_prove_idempotency(client, store):
    workflow = create_plan(client)
    action_id = workflow["response"]["action_id"]
    for _ in range(2):
        response = client.post(f"/api/actions/{action_id}/approve", json={"confirmed": True})
        assert response.status_code == 200
        assert response.json()["status"] == "completed"
        assert "Verified local simulated inbox record" in response.json()["result"]
    factory, _ = store
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(FamilyDelivery)) == 1
        assert db.scalar(select(func.count()).select_from(Approval)) == 1
    history = client.get("/api/history").json()
    entries = [e for e in reversed(history) if e["action_id"] == action_id]
    assert [e["execution_status"] for e in entries] == ["approved", "executing", "completed"]
    assert all(e["approval_status"] == "approved" for e in entries)
    assert client.get("/api/workflows").json()[0]["status"] == "completed"


def test_rejected_action_never_executes(client, store):
    action_id = create_plan(client)["response"]["action_id"]
    assert client.post(f"/api/actions/{action_id}/reject").json()["status"] == "rejected"
    assert client.post(f"/api/actions/{action_id}/reject").status_code == 200
    assert client.post(f"/api/actions/{action_id}/approve", json={"confirmed": True}).status_code == 409
    with store[0]() as db:
        assert db.scalar(select(func.count()).select_from(FamilyDelivery)) == 0


@pytest.mark.parametrize(
    "scenario,expected", [("missing", "No event records available"), ("unavailable", "source unavailable")]
)
def test_missing_and_unavailable(client, scenario, expected):
    workflow = create_plan(client, scenario)
    assert any(expected in text for text in workflow["response"]["limitations"])
    assert any(
        "not" in text or "cannot" in text or "unknown" in text for text in workflow["response"]["limitations"]
    )
    event_step = workflow["steps"][1]
    assert event_step["status"] == ("failed" if scenario == "unavailable" else "completed")
    if scenario == "unavailable":
        assert any(e["execution_status"] == "failed" for e in client.get("/api/history").json())


@pytest.mark.parametrize(
    "body",
    [
        {"message": ""},
        {"message": "   "},
        {"message": "x" * 2001},
        {"message": "routine", "scenario": "malicious"},
        {},
    ],
)
def test_invalid_requests(client, body):
    assert client.post("/api/chat", json=body).status_code == 422


def test_unknown_intent_does_not_propose_action(client):
    response = client.post("/api/chat", json={"message": "play jazz"}).json()
    assert response["intent"] == "unsupported"
    assert response["response"]["action_id"] is None
    assert client.get("/api/actions").json() == []


def test_direct_task_completion_and_notes(client):
    response = client.patch(
        "/api/routines/4", json={"status": "completed", "notes": "Maya confirmed the fictional check-in"}
    )
    assert response.json()["status"] == "completed"
    assert response.json()["needs_attention"] is False
    assert client.get("/api/dashboard").json()["pending"] == 3
    assert client.patch("/api/routines/999", json={"status": "completed"}).status_code == 404
    assert client.patch("/api/routines/4", json={"status": "invented"}).status_code == 422
    assert client.patch("/api/routines/4", json={"notes": "x" * 501}).status_code == 422


def test_database_restart_preserves_outcome(store):
    factory, url = store
    with factory() as db:
        action_id = run_workflow(db, ChatIn(message="Prepare evening routine")).response["action_id"]
    with factory() as db:
        decide_action(db, action_id, "approve")
    restarted = make_engine(url)
    with Session(restarted) as db:
        seed(db)  # An initialization command must never replace existing data.
        assert db.get(ProposedAction, action_id).status == "completed"
        assert db.scalar(select(func.count()).select_from(FamilyDelivery)) == 1
    restarted.dispose()


def test_concurrent_approvals_execute_once(store):
    factory, _ = store
    with factory() as db:
        action_id = run_workflow(db, ChatIn(message="Prepare family update")).response["action_id"]

    def approve():
        with factory() as db:
            return decide_action(db, action_id, "approve").status

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert list(pool.map(lambda _: approve(), range(2))) == ["completed", "completed"]
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(FamilyDelivery)) == 1


def test_execution_failure_is_not_completion(client, store, monkeypatch):
    action_id = create_plan(client)["response"]["action_id"]

    def fail(db, request):
        raise RuntimeError("Injected local inbox write failure")

    monkeypatch.setitem(tools.REGISTRY, "execute_approved_action", fail)
    response = client.post(f"/api/actions/{action_id}/approve", json={"confirmed": True})
    assert response.json()["status"] == "failed"
    assert "write failure" in response.json()["result"]
    with store[0]() as db:
        assert db.scalar(select(func.count()).select_from(FamilyDelivery)) == 0
    assert client.get("/api/workflows").json()[0]["status"] == "failed"


def test_partial_write_is_rolled_back(client, store, monkeypatch):
    action_id = create_plan(client)["response"]["action_id"]

    def fail_after_flush(db, request):
        db.add(FamilyDelivery(action_id=action_id, message="partial"))
        db.flush()
        raise RuntimeError("Verification failed")

    monkeypatch.setitem(tools.REGISTRY, "execute_approved_action", fail_after_flush)
    assert (
        client.post(f"/api/actions/{action_id}/approve", json={"confirmed": True}).json()["status"]
        == "failed"
    )
    with store[0]() as db:
        assert db.scalar(select(func.count()).select_from(FamilyDelivery)) == 0


def test_confirmation_and_reset(client):
    create_plan(client)
    assert client.post("/api/demo/reset", json={"confirmed": False}).status_code == 422
    assert client.post("/api/demo/reset", json={"confirmed": True}).status_code == 200
    assert client.get("/api/actions").json() == []
    assert client.get("/api/workflows").json() == []
    assert client.get("/api/dashboard").json()["total"] == 6


def test_filters_limits_and_confirmation(client):
    assert len(client.get("/api/events?category=sensor&severity=warning").json()) == 1
    assert len(client.get("/api/events?limit=2&offset=2").json()) == 2
    assert client.get("/api/events?limit=1000").status_code == 422
    assert client.get("/api/history?offset=-1").status_code == 422
    assert client.get("/api/actions/no-such-id").status_code == 404
    action_id = create_plan(client)["response"]["action_id"]
    assert client.post(f"/api/actions/{action_id}/approve", json={}).status_code == 422


def test_no_event_records_does_not_imply_security(store):
    factory, _ = store
    with factory() as db:
        for event in db.scalars(select(HomeEvent)):
            db.delete(event)
        db.commit()
        result = invoke("inspect_simulated_home_events", db, {"workflow_id": "test"})
        assert result.data["events"] == []
        assert "not proof of safety" in result.data["limitations"][0]


def test_tool_validation_and_allowlist(store):
    with store[0]() as db:
        with pytest.raises(ValueError, match="allowlisted"):
            invoke("run_arbitrary_python", db, {"workflow_id": "test"})
        with pytest.raises(ValidationError):
            invoke("get_today_schedule", db, {"workflow_id": ""})
        with pytest.raises(ValueError, match="approved"):
            invoke("execute_approved_action", db, {"workflow_id": "test", "data": {"action_id": "missing"}})


def test_all_read_and_planning_tools_are_structured(store):
    with store[0]() as db:
        schedule = invoke("get_today_schedule", db, {"workflow_id": "test"})
        pending = invoke("get_pending_tasks", db, {"workflow_id": "test"})
        events = invoke("inspect_simulated_home_events", db, {"workflow_id": "test"})
        assert len(schedule.data["tasks"]) == 6
        assert len(tasks_today(db)) == 6
        assert pending.data["tasks"][0]["id"] == 4
        context = {"tasks": pending.data["tasks"], **events.data}
        plan = invoke("create_prioritized_plan", db, {"workflow_id": "test", "data": context})
        assert len(plan.data["plan"]) == 5
        draft = invoke("prepare_family_update", db, {"workflow_id": "test", "data": context})
        assert "No real message" in draft.data["message"]
        db.add(Workflow(id="test", request="test", intent="family_update", status="executing"))
        db.flush()
        proposal = invoke("create_approval_request", db, {"workflow_id": "test", "data": draft.data})
        assert db.get(ProposedAction, proposal.data["action_id"]).status == "awaiting_approval"
        ledger = invoke(
            "write_action_ledger_entry",
            db,
            {
                "workflow_id": "test",
                "data": {
                    "tool_name": "test",
                    "description": "test",
                    "execution_status": "completed",
                    "result": "test",
                },
            },
        )
        assert db.get(ActionLedgerEntry, ledger.data["ledger_id"]).result == "test"


def test_completed_tasks_are_excluded_from_plan(store):
    with store[0]() as db:
        for task in db.scalars(select(RoutineTask)):
            task.status = "completed"
        db.commit()
        workflow = run_workflow(db, ChatIn(message="What tasks are pending?"))
        assert workflow.response["plan"] == []


def test_database_operation_failure_is_recorded(client, store, monkeypatch):
    action_id = create_plan(client)["response"]["action_id"]

    def fail(db, request):
        raise SQLAlchemyError("Injected database failure")

    monkeypatch.setitem(tools.REGISTRY, "execute_approved_action", fail)
    response = client.post(f"/api/actions/{action_id}/approve", json={"confirmed": True})
    assert response.json()["status"] == "failed"
    assert "No successful delivery" in response.json()["result"]
    with store[0]() as db:
        assert db.scalar(select(func.count()).select_from(FamilyDelivery)) == 0


def test_approval_metric_counts_beyond_recent_action_limit(client, store):
    action_id = create_plan(client)["response"]["action_id"]
    with store[0]() as db:
        original = db.get(ProposedAction, action_id)
        for number in range(100):
            db.add(
                ProposedAction(
                    id=f"extra-{number}",
                    workflow_id=original.workflow_id,
                    title="Count regression fixture",
                    reason=original.reason,
                    payload=original.payload,
                    evidence=[],
                    expected_effect=original.expected_effect,
                    status="awaiting_approval",
                )
            )
        db.commit()
    assert client.get("/api/dashboard").json()["approvals"] == 101
    assert len(client.get("/api/actions").json()) == 100
