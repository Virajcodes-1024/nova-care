"""Allowlisted local tools. Mutating tools flush; their caller owns the transaction."""

from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field
from sqlalchemy import select

from . import repository
from .models import ActionLedgerEntry, FamilyDelivery, ProposedAction
from .schemas import EventOut, Evidence, PlanItem


class ToolInput(BaseModel):
    workflow_id: str = Field(min_length=1, max_length=64)
    scenario: Literal["normal", "missing", "unavailable"] = "normal"
    data: dict = Field(default_factory=dict)


class ToolOutput(BaseModel):
    data: dict
    summary: str


def get_today_schedule(db, request: ToolInput):
    tasks = [repository.task_out(t).model_dump() for t in repository.tasks_today(db)]
    return ToolOutput(data={"tasks": tasks}, summary=f"Read {len(tasks)} tasks scheduled today.")


def get_pending_tasks(db, request: ToolInput):
    tasks = [repository.task_out(t).model_dump() for t in repository.tasks_today(db) if t.status == "pending"]
    tasks.sort(key=lambda t: ({"high": 0, "medium": 1, "low": 2}[t["priority"]], t["scheduled_at"]))
    return ToolOutput(
        data={"tasks": tasks},
        summary=f"Identified {len(tasks)} pending tasks. High priority precedes scheduled time.",
    )


def inspect_simulated_home_events(db, request: ToolInput):
    if request.scenario == "unavailable":
        raise RuntimeError("Simulated event source unavailable. Home state cannot be assessed.")
    events = (
        []
        if request.scenario == "missing"
        else [EventOut.model_validate(e).model_dump() for e in repository.events_today(db)]
    )
    limitations = []
    if not events:
        limitations.append(
            "No event records available for this period. Absence of records is not proof of safety."
        )
    if any(e["verification"] == "unavailable" for e in events):
        limitations.append("A simulated sensor update is unavailable; its current state is unknown.")
    limitations.append("Simulated records do not establish that the home is secure.")
    return ToolOutput(
        data={"events": events, "limitations": limitations},
        summary=f"Reviewed {len(events)} simulated records; no safety conclusion made.",
    )


def create_prioritized_plan(db, request: ToolInput):
    plan = []
    for task in request.data.get("tasks", []):
        reason = "High-priority pending task" if task["priority"] == "high" else "Pending task"
        if task["needs_attention"]:
            reason += "; high priority or scheduled time has passed"
        plan.append(
            PlanItem(
                title=task["title"],
                priority=task["priority"],
                explanation=f"{reason}. Rule: completed tasks are excluded; priority then time determines order.",
                evidence=[Evidence(kind="task", id=task["id"], label=task["title"])],
            )
        )
    limitations = request.data.get("limitations", [])
    if any("unavailable" in item.lower() or "no event records" in item.lower() for item in limitations):
        plan.append(
            PlanItem(
                title="Confirm unavailable information with a family member",
                priority="medium",
                explanation="Suggestion: ask for a human check-in. Missing telemetry does not imply safety or danger.",
                evidence=[
                    Evidence(kind="event", id=e["id"], label=e["description"])
                    for e in request.data.get("events", [])
                    if e["verification"] == "unavailable"
                ],
            )
        )
    return ToolOutput(
        data={"plan": [p.model_dump() for p in plan]},
        summary=f"Validated {len(plan)} plan steps. Suggestions do not complete routine tasks.",
    )


def prepare_family_update(db, request: ToolInput):
    tasks = request.data.get("tasks", [])
    events = request.data.get("events", [])
    limitations = request.data.get("limitations", [])
    message = "Fictional family update — NOVA Care local simulation.\n"
    message += f"{len(tasks)} pending tasks: " + (", ".join(t["title"] for t in tasks) or "none") + ".\n"
    message += f"Reviewed {len(events)} simulated home records.\n"
    message += "\n".join(limitations)
    message += (
        "\nPlease confirm the evening check-in and coordinate remaining tasks. No real message will be sent."
    )
    evidence = [Evidence(kind="task", id=t["id"], label=t["title"]).model_dump() for t in tasks]
    evidence += [Evidence(kind="event", id=e["id"], label=e["description"]).model_dump() for e in events]
    return ToolOutput(
        data={"message": message, "evidence": evidence},
        summary="Prepared a draft for review; no delivery has occurred.",
    )


def create_approval_request(db, request: ToolInput):
    message = request.data.get("message")
    if not isinstance(message, str) or not message.strip():
        raise ValueError("A nonempty family update is required")
    evidence = [Evidence.model_validate(e).model_dump() for e in request.data.get("evidence", [])]
    action = ProposedAction(
        id=str(uuid4()),
        workflow_id=request.workflow_id,
        title="Deliver family update to the simulated inbox",
        reason="Share the pending routine tasks and explicitly qualified event review with the fictional family.",
        payload={"message": message},
        evidence=evidence,
        expected_effect="Create one persistent record in the local simulated family inbox. No email, SMS, or external service is contacted.",
        status="awaiting_approval",
    )
    db.add(action)
    db.flush()
    return ToolOutput(
        data={"action_id": action.id}, summary="Awaiting explicit approval. Rejection prevents execution."
    )


def execute_approved_action(db, request: ToolInput):
    action = db.get(ProposedAction, request.data.get("action_id"))
    if not action or action.status != "executing":
        raise ValueError("Action must be approved and claimed for execution")
    message = action.payload.get("message")
    if not isinstance(message, str) or not message.strip():
        raise ValueError("Action payload has no valid message")
    delivery = FamilyDelivery(action_id=action.id, message=message)
    db.add(delivery)
    db.flush()
    persisted = db.scalar(select(FamilyDelivery).where(FamilyDelivery.action_id == action.id))
    if persisted is None or persisted.message != message:
        raise RuntimeError("Persisted delivery could not be verified")
    return ToolOutput(
        data={"delivery_id": persisted.id},
        summary=f"Verified local simulated inbox record #{persisted.id}. No external message sent.",
    )


def write_action_ledger_entry(db, request: ToolInput):
    data = request.data
    entry = ActionLedgerEntry(
        workflow_id=request.workflow_id,
        action_id=data.get("action_id"),
        tool_name=data["tool_name"],
        description=data["description"],
        approval_status=data.get("approval_status", "not_required"),
        execution_status=data["execution_status"],
        result=data["result"],
    )
    db.add(entry)
    db.flush()
    return ToolOutput(data={"ledger_id": entry.id}, summary="Persistent ledger record written.")


REGISTRY = {
    fn.__name__: fn
    for fn in (
        get_today_schedule,
        get_pending_tasks,
        inspect_simulated_home_events,
        create_prioritized_plan,
        prepare_family_update,
        create_approval_request,
        execute_approved_action,
        write_action_ledger_entry,
    )
}


def invoke(name, db, request):
    if name not in REGISTRY:
        raise ValueError("Tool is not allowlisted")
    validated = ToolInput.model_validate(request)
    return ToolOutput.model_validate(REGISTRY[name](db, validated))
