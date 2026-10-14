from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ActionStatus = Literal[
    "proposed", "awaiting_approval", "approved", "executing", "completed", "failed", "rejected"
]


class Record(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TaskOut(Record):
    id: int
    routine_id: int
    title: str
    description: str
    scheduled_at: str
    priority: Literal["high", "medium", "low"]
    status: Literal["pending", "completed"]
    notes: str
    needs_attention: bool = False


class RoutineOut(Record):
    id: int
    title: str
    person: str
    description: str
    tasks: list[TaskOut]


class EventOut(Record):
    id: int
    timestamp: str
    category: str
    description: str
    source: str
    severity: str
    verification: str
    simulated: bool


class Evidence(BaseModel):
    kind: Literal["task", "event"]
    id: int
    label: str


class PlanItem(BaseModel):
    title: str
    priority: Literal["high", "medium", "low"]
    explanation: str
    evidence: list[Evidence]
    dependencies: list[str] = Field(default_factory=list)


class ActionOut(Record):
    id: str
    workflow_id: str
    title: str
    reason: str
    payload: dict
    evidence: list[Evidence]
    expected_effect: str
    external_state: bool
    status: ActionStatus
    result: str | None
    created_at: str
    updated_at: str


class StepOut(Record):
    position: int
    tool_name: str
    status: str
    output: dict
    created_at: str


class WorkflowOut(Record):
    id: str
    request: str
    intent: str
    status: str
    response: dict
    steps: list[StepOut]
    created_at: str


class LedgerOut(Record):
    id: int
    timestamp: str
    workflow_id: str | None
    action_id: str | None
    tool_name: str
    description: str
    approval_status: str
    execution_status: str
    result: str


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    scenario: Literal["normal", "missing", "unavailable"] = "normal"

    @field_validator("message")
    @classmethod
    def not_blank(cls, value):
        if not value.strip():
            raise ValueError("Message cannot be blank")
        return value.strip()


class TaskPatch(BaseModel):
    status: Literal["pending", "completed"] | None = None
    notes: str | None = Field(default=None, max_length=500)


class Confirmation(BaseModel):
    confirmed: Literal[True]


class DashboardOut(BaseModel):
    today: str
    current_time: str
    total: int
    completed: int
    pending: int
    attention: int
    approvals: int
    tasks: list[TaskOut]
    events: list[EventOut]
    actions: list[ActionOut]


class HealthOut(BaseModel):
    status: str
    provider: str
    demo_mode: bool


class ResetOut(BaseModel):
    status: str
