from datetime import datetime

from sqlalchemy import select

from .config import TIMEZONE
from .models import HomeEvent, Routine, RoutineTask, Workflow, WorkflowStep
from .schemas import RoutineOut, TaskOut, WorkflowOut


def today_bounds():
    now = datetime.now(TIMEZONE)
    return now.date().isoformat(), now


def tasks_today(db):
    day, _ = today_bounds()
    return list(
        db.scalars(
            select(RoutineTask)
            .where(RoutineTask.scheduled_at.startswith(day))
            .order_by(RoutineTask.scheduled_at)
        )
    )


def task_out(task):
    now = datetime.now(TIMEZONE)
    return TaskOut.model_validate(task).model_copy(
        update={
            "needs_attention": task.status != "completed"
            and (task.priority == "high" or datetime.fromisoformat(task.scheduled_at) < now)
        }
    )


def routines(db, today=False):
    result = []
    for routine in db.scalars(select(Routine).order_by(Routine.id)):
        tasks = list(
            db.scalars(
                select(RoutineTask)
                .where(RoutineTask.routine_id == routine.id)
                .order_by(RoutineTask.scheduled_at)
            )
        )
        if today:
            day, _ = today_bounds()
            tasks = [t for t in tasks if t.scheduled_at.startswith(day)]
        result.append(
            RoutineOut(
                id=routine.id,
                title=routine.title,
                person=routine.person,
                description=routine.description,
                tasks=[task_out(t) for t in tasks],
            )
        )
    return result


def events_today(db):
    day, _ = today_bounds()
    return list(
        db.scalars(
            select(HomeEvent)
            .where(HomeEvent.timestamp.startswith(day))
            .order_by(HomeEvent.timestamp.desc())
            .limit(100)
        )
    )


def workflow_out(db, workflow):
    steps = list(
        db.scalars(
            select(WorkflowStep)
            .where(WorkflowStep.workflow_id == workflow.id)
            .order_by(WorkflowStep.position)
        )
    )
    return WorkflowOut(
        id=workflow.id,
        request=workflow.request,
        intent=workflow.intent,
        status=workflow.status,
        response=workflow.response,
        steps=steps,
        created_at=workflow.created_at,
    )


def recent_workflows(db):
    return [
        workflow_out(db, w)
        for w in db.scalars(select(Workflow).order_by(Workflow.created_at.desc()).limit(30))
    ]
