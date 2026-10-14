from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from .models import Approval, ProposedAction, Workflow, WorkflowStep
from .tools import invoke


def decide_action(db, action_id, decision):
    # Serialize decisions before reading state, including concurrent HTTP requests.
    db.execute(text("BEGIN IMMEDIATE"))
    action = db.get(ProposedAction, action_id)
    if not action:
        raise HTTPException(404, "Action not found")
    if action.status in ("completed", "failed", "rejected"):
        if (decision == "reject" and action.status == "rejected") or (
            decision == "approve" and action.status in ("completed", "failed")
        ):
            db.commit()
            return action
        raise HTTPException(409, f"Action is already {action.status}")
    if action.status != "awaiting_approval":
        raise HTTPException(409, "Action is not awaiting approval")
    workflow = db.get(Workflow, action.workflow_id)
    db.add(Approval(action_id=action.id, decision=decision))

    def ledger(status, message, approval):
        invoke(
            "write_action_ledger_entry",
            db,
            {
                "workflow_id": action.workflow_id,
                "data": {
                    "action_id": action.id,
                    "tool_name": "execute_approved_action" if approval == "approved" else "approval_decision",
                    "description": action.title,
                    "approval_status": approval,
                    "execution_status": status,
                    "result": message,
                },
            },
        )

    if decision == "reject":
        action.status = "rejected"
        action.result = "Rejected by user. No execution or delivery occurred."
        workflow.status = "rejected"
        ledger("rejected", action.result, "rejected")
        db.commit()
        return action
    action.status = "approved"
    ledger("approved", "Explicit user approval recorded. Execution has not yet succeeded.", "approved")
    action.status = "executing"
    ledger("executing", "Executing local simulated inbox operation.", "approved")
    try:
        with db.begin_nested():
            result = invoke(
                "execute_approved_action", db, {"workflow_id": workflow.id, "data": {"action_id": action.id}}
            )
        action.status = "completed"
        action.result = result.summary
        workflow.status = "completed"
    except (RuntimeError, ValueError) as error:
        action.status = "failed"
        action.result = str(error)
        workflow.status = "failed"
    except SQLAlchemyError:
        action.status = "failed"
        action.result = "Local database operation failed. No successful delivery is claimed."
        workflow.status = "failed"
    ledger(action.status, action.result, "approved")
    steps = list(db.scalars(select(WorkflowStep).where(WorkflowStep.workflow_id == workflow.id)))
    db.add(
        WorkflowStep(
            workflow_id=workflow.id,
            position=len(steps) + 1,
            tool_name="execute_approved_action",
            status=action.status,
            output={"summary": action.result, "data": {}},
        )
    )
    db.commit()
    # Reload after transaction commit; success is returned only after persistence succeeds.
    db.refresh(action)
    return action
