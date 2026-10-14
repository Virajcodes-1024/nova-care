import argparse
from datetime import datetime

from sqlalchemy import delete, select

from .config import TIMEZONE
from .database import Base, SessionLocal, engine
from .models import (
    ActionLedgerEntry,
    Approval,
    FamilyDelivery,
    HomeEvent,
    ProposedAction,
    Routine,
    RoutineTask,
    Workflow,
    WorkflowStep,
)


def seed(db, reset=False):
    if reset:
        for model in (
            FamilyDelivery,
            Approval,
            ActionLedgerEntry,
            ProposedAction,
            WorkflowStep,
            Workflow,
            HomeEvent,
            RoutineTask,
            Routine,
        ):
            db.execute(delete(model))
    elif db.scalar(select(Routine.id).limit(1)):
        return
    day = datetime.now(TIMEZONE).date().isoformat()

    def at(time):
        return f"{day}T{time}:00+05:30"

    db.add(
        Routine(
            id=1,
            title="Arun’s daily rhythm",
            person="Arun Mehta (fictional)",
            description="Small routines, shared responsibility. All household data is fictional.",
        )
    )
    db.flush()
    fixtures = [
        ("Morning check-in", "A quick conversation to plan the day.", "09:00", "medium", "completed"),
        ("Lunch together", "Prepare lunch and check the afternoon schedule.", "13:00", "low", "completed"),
        ("Afternoon walk", "Coordinate a short walk with Maya.", "16:30", "medium", "pending"),
        ("Evening check-in", "Ask Arun how the day went and confirm plans.", "18:00", "high", "pending"),
        ("Prepare dinner", "Set the table and prepare the evening meal.", "18:30", "medium", "pending"),
        ("Family catch-up", "Prepare a brief update for the local demo inbox.", "19:00", "low", "pending"),
    ]
    for i, (title, description, time, priority, status) in enumerate(fixtures, 1):
        db.add(
            RoutineTask(
                id=i,
                routine_id=1,
                title=title,
                description=description,
                scheduled_at=at(time),
                priority=priority,
                status=status,
                notes="Fictional demo record",
            )
        )
    events = [
        ("16:05", "door", "Simulated front door opened.", "info", "recorded"),
        (
            "16:07",
            "door",
            "Simulated front door closed. This does not establish home security.",
            "info",
            "recorded",
        ),
        ("16:15", "check-in", "Maya recorded a fictional routine check-in.", "info", "recorded"),
        (
            "17:10",
            "sensor",
            "Simulated hallway sensor update unavailable. Current state is unknown.",
            "warning",
            "unavailable",
        ),
    ]
    for i, (time, category, description, severity, verification) in enumerate(events, 1):
        db.add(
            HomeEvent(
                id=i,
                timestamp=at(time),
                category=category,
                description=description,
                severity=severity,
                verification=verification,
                source="Local demo fixture • not a live device",
            )
        )
    db.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Explicitly replace all local demo records")
    args = parser.parse_args()
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db, reset=args.reset)
    print("Demo data initialized. Existing records preserved unless --reset was supplied.")
