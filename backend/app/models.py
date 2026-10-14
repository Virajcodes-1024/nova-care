from sqlalchemy import JSON, Boolean, CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base, utcnow


class Timestamps:
    created_at: Mapped[str] = mapped_column(String, default=utcnow)
    updated_at: Mapped[str] = mapped_column(String, default=utcnow, onupdate=utcnow)


class Routine(Timestamps, Base):
    __tablename__ = "routines"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String)
    person: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)


class RoutineTask(Timestamps, Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint("status IN ('pending','completed')"),
        CheckConstraint("priority IN ('high','medium','low')"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("routines.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    scheduled_at: Mapped[str] = mapped_column(String, index=True)
    priority: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pending")
    notes: Mapped[str] = mapped_column(Text, default="")


class HomeEvent(Timestamps, Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True)
    timestamp: Mapped[str] = mapped_column(String, index=True)
    category: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)
    verification: Mapped[str] = mapped_column(String)
    simulated: Mapped[bool] = mapped_column(Boolean, default=True)


class Workflow(Timestamps, Base):
    __tablename__ = "workflows"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    request: Mapped[str] = mapped_column(Text)
    intent: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    response: Mapped[dict] = mapped_column(JSON, default=dict)


class WorkflowStep(Timestamps, Base):
    __tablename__ = "steps"
    id: Mapped[int] = mapped_column(primary_key=True)
    workflow_id: Mapped[str] = mapped_column(ForeignKey("workflows.id"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    tool_name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    output: Mapped[dict] = mapped_column(JSON)


class ProposedAction(Timestamps, Base):
    __tablename__ = "actions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('proposed','awaiting_approval','approved','executing','completed','failed','rejected')"
        ),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True)
    workflow_id: Mapped[str] = mapped_column(ForeignKey("workflows.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    reason: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSON)
    evidence: Mapped[list] = mapped_column(JSON)
    expected_effect: Mapped[str] = mapped_column(Text)
    external_state: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String, default="proposed", index=True)
    result: Mapped[str | None] = mapped_column(Text, nullable=True)


class Approval(Timestamps, Base):
    __tablename__ = "approvals"
    id: Mapped[int] = mapped_column(primary_key=True)
    action_id: Mapped[str] = mapped_column(ForeignKey("actions.id"), unique=True)
    decision: Mapped[str] = mapped_column(String)


class ActionLedgerEntry(Base):
    __tablename__ = "ledger"
    id: Mapped[int] = mapped_column(primary_key=True)
    timestamp: Mapped[str] = mapped_column(String, default=utcnow, index=True)
    workflow_id: Mapped[str | None] = mapped_column(ForeignKey("workflows.id"), nullable=True, index=True)
    action_id: Mapped[str | None] = mapped_column(ForeignKey("actions.id"), nullable=True)
    tool_name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    approval_status: Mapped[str] = mapped_column(String)
    execution_status: Mapped[str] = mapped_column(String)
    result: Mapped[str] = mapped_column(Text)


class FamilyDelivery(Timestamps, Base):
    __tablename__ = "deliveries"
    id: Mapped[int] = mapped_column(primary_key=True)
    action_id: Mapped[str] = mapped_column(ForeignKey("actions.id"), unique=True)
    message: Mapped[str] = mapped_column(Text)
    channel: Mapped[str] = mapped_column(String, default="local simulated family inbox")
