from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import repository
from .config import TIMEZONE
from .database import get_db
from .models import ActionLedgerEntry, HomeEvent, ProposedAction, RoutineTask
from .schemas import (
    ActionOut,
    ChatIn,
    Confirmation,
    DashboardOut,
    EventOut,
    HealthOut,
    LedgerOut,
    ResetOut,
    RoutineOut,
    TaskOut,
    TaskPatch,
    WorkflowOut,
)
from .seed import seed
from .services import decide_action
from .workflow import run_workflow

router = APIRouter(prefix="/api")
DB = Annotated[Session, Depends(get_db)]


@router.get("/health", response_model=HealthOut)
def health(db: DB):
    db.execute(select(1))
    return {"status": "connected", "provider": "deterministic local engine", "demo_mode": True}


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: DB):
    tasks = [repository.task_out(t) for t in repository.tasks_today(db)]
    actions = list(db.scalars(select(ProposedAction).order_by(ProposedAction.created_at.desc()).limit(100)))
    return {
        "today": datetime.now(TIMEZONE).date().isoformat(),
        "current_time": datetime.now(TIMEZONE).isoformat(),
        "total": len(tasks),
        "completed": sum(t.status == "completed" for t in tasks),
        "pending": sum(t.status == "pending" for t in tasks),
        "attention": sum(t.needs_attention for t in tasks),
        "approvals": db.scalar(
            select(func.count())
            .select_from(ProposedAction)
            .where(ProposedAction.status == "awaiting_approval")
        ),
        "tasks": tasks,
        "events": repository.events_today(db)[:4],
        "actions": actions[:5],
    }


@router.get("/routines", response_model=list[RoutineOut])
def routines(db: DB):
    return repository.routines(db)


@router.get("/routines/today", response_model=list[RoutineOut])
def routines_today(db: DB):
    return repository.routines(db, today=True)


@router.patch("/routines/{task_id}", response_model=TaskOut)
def patch_task(task_id: int, patch: TaskPatch, db: DB):
    task = db.get(RoutineTask, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if patch.status is not None:
        task.status = patch.status
    if patch.notes is not None:
        task.notes = patch.notes
    db.add(
        ActionLedgerEntry(
            tool_name="update_routine_task",
            description=task.title,
            approval_status="direct_user_action",
            execution_status="completed",
            result=f"Task status: {task.status}; notes persisted.",
        )
    )
    db.commit()
    return repository.task_out(task)


@router.get("/events", response_model=list[EventOut])
def events(
    db: DB,
    category: str | None = None,
    severity: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = select(HomeEvent)
    if category:
        query = query.where(HomeEvent.category == category)
    if severity:
        query = query.where(HomeEvent.severity == severity)
    return list(db.scalars(query.order_by(HomeEvent.timestamp.desc()).limit(limit).offset(offset)))


@router.post("/chat", response_model=WorkflowOut, status_code=201)
def chat(body: ChatIn, db: DB):
    return run_workflow(db, body)


@router.get("/workflows", response_model=list[WorkflowOut])
def workflows(db: DB):
    return repository.recent_workflows(db)


@router.get("/actions", response_model=list[ActionOut])
def actions(db: DB, limit: int = Query(100, ge=1, le=200), offset: int = Query(0, ge=0)):
    return list(
        db.scalars(
            select(ProposedAction).order_by(ProposedAction.created_at.desc()).limit(limit).offset(offset)
        )
    )


@router.get("/actions/{action_id}", response_model=ActionOut)
def action_detail(action_id: str, db: DB):
    action = db.get(ProposedAction, action_id)
    if not action:
        raise HTTPException(404, "Action not found")
    return action


@router.post("/actions/{action_id}/approve", response_model=ActionOut)
def approve(action_id: str, body: Confirmation, db: DB):
    return decide_action(db, action_id, "approve")


@router.post("/actions/{action_id}/reject", response_model=ActionOut)
def reject(action_id: str, db: DB):
    return decide_action(db, action_id, "reject")


@router.get("/history", response_model=list[LedgerOut])
def history(
    db: DB, status: str | None = None, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)
):
    query = select(ActionLedgerEntry)
    if status:
        query = query.where(ActionLedgerEntry.execution_status == status)
    return list(db.scalars(query.order_by(ActionLedgerEntry.id.desc()).limit(limit).offset(offset)))


@router.post("/demo/reset", response_model=ResetOut)
def reset(body: Confirmation, db: DB):
    seed(db, reset=True)
    return {"status": "reset"}
