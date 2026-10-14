from uuid import uuid4

from .models import Workflow, WorkflowStep
from .repository import workflow_out
from .schemas import ChatIn
from .tools import invoke


def interpret(message):
    text = message.lower()
    if any(term in text for term in ("evening", "routine", "father")):
        return "evening_routine"
    if any(term in text for term in ("family", "update")):
        return "family_update"
    if any(term in text for term in ("event", "door", "sensor", "home")):
        return "event_review"
    if any(term in text for term in ("pending", "task", "attention", "explain")):
        return "pending_tasks"
    return "unsupported"


def run_workflow(db, chat: ChatIn):
    intent = interpret(chat.message)
    workflow = Workflow(id=str(uuid4()), request=chat.message, intent=intent, status="executing")
    db.add(workflow)
    db.flush()
    position = 0
    failures = []

    def run(name, data=None):
        nonlocal position
        position += 1
        try:
            result = invoke(
                name, db, {"workflow_id": workflow.id, "scenario": chat.scenario, "data": data or {}}
            )
            output = result.model_dump()
            status = "completed"
        except (RuntimeError, ValueError) as error:
            output = {"data": {}, "summary": str(error)}
            status = "failed"
            failures.append(str(error))
        db.add(
            WorkflowStep(
                workflow_id=workflow.id, position=position, tool_name=name, status=status, output=output
            )
        )
        invoke(
            "write_action_ledger_entry",
            db,
            {
                "workflow_id": workflow.id,
                "data": {
                    "tool_name": name,
                    "description": output["summary"],
                    "execution_status": status,
                    "result": output["summary"],
                },
            },
        )
        return output["data"]

    if intent == "unsupported":
        workflow.status = "completed"
        workflow.response = {
            "summary": "I can coordinate routines, review simulated events, list pending tasks, and prepare a family update. Choose a starter prompt.",
            "plan": [],
            "facts": [],
            "limitations": [],
            "action_id": None,
        }
    else:
        schedule = run("get_today_schedule")
        event_data = (
            run("inspect_simulated_home_events")
            if intent != "pending_tasks"
            else {"events": [], "limitations": ["Home events were not reviewed for this task-only request."]}
        )
        pending = run("get_pending_tasks")
        limitations = event_data.get("limitations", []) + failures
        context = {
            "tasks": pending.get("tasks", []),
            "events": event_data.get("events", []),
            "limitations": limitations,
        }
        planned = run("create_prioritized_plan", context)
        action_id = None
        if intent in ("evening_routine", "family_update"):
            draft = run("prepare_family_update", context)
            approval = run("create_approval_request", draft)
            action_id = approval.get("action_id")
        facts = [
            {"kind": "observed", "text": f"Schedule contains {len(schedule.get('tasks', []))} tasks today."},
            {
                "kind": "derived",
                "text": f"{len(pending.get('tasks', []))} tasks remain pending according to their stored completion status.",
            },
        ]
        if intent != "pending_tasks":
            facts.append(
                {"kind": "observed", "text": f"Retrieved {len(context['events'])} simulated event records."}
            )
        workflow.status = "awaiting_approval" if action_id else ("failed" if failures else "completed")
        workflow.response = {
            "summary": "Your plan is ready. Review the evidence and approve the local simulated family update."
            if action_id
            else "Review complete. The findings below are grounded in local records.",
            "plan": planned.get("plan", []),
            "facts": facts,
            "limitations": limitations,
            "action_id": action_id,
        }
    db.commit()
    return workflow_out(db, workflow)
