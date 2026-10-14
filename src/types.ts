export type Task = {
  id: number;
  routine_id: number;
  title: string;
  description: string;
  scheduled_at: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed";
  notes: string;
  needs_attention: boolean;
};
export type Routine = {
  id: number;
  title: string;
  person: string;
  description: string;
  tasks: Task[];
};
export type HomeEvent = {
  id: number;
  timestamp: string;
  category: string;
  description: string;
  source: string;
  severity: string;
  verification: string;
  simulated: boolean;
};
export type Evidence = { kind: "task" | "event"; id: number; label: string };
export type Plan = {
  title: string;
  priority: string;
  explanation: string;
  evidence: Evidence[];
  dependencies: string[];
};
export type ActionStatus =
  | "proposed"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "completed"
  | "failed"
  | "rejected";
export type Action = {
  id: string;
  workflow_id: string;
  title: string;
  reason: string;
  payload: { message?: string };
  evidence: Evidence[];
  expected_effect: string;
  external_state: boolean;
  status: ActionStatus;
  result: string | null;
  created_at: string;
  updated_at: string;
};
export type Workflow = {
  id: string;
  request: string;
  intent: string;
  status: string;
  response: {
    summary: string;
    plan: Plan[];
    facts: { kind: string; text: string }[];
    limitations: string[];
    action_id: string | null;
  };
  steps: {
    position: number;
    tool_name: string;
    status: string;
    output: { summary: string; data: Record<string, unknown> };
    created_at: string;
  }[];
  created_at: string;
};
export type Ledger = {
  id: number;
  timestamp: string;
  workflow_id: string | null;
  action_id: string | null;
  tool_name: string;
  description: string;
  approval_status: string;
  execution_status: string;
  result: string;
};
export type Dashboard = {
  today: string;
  current_time: string;
  total: number;
  completed: number;
  pending: number;
  attention: number;
  approvals: number;
  tasks: Task[];
  events: HomeEvent[];
  actions: Action[];
};
export type Health = { status: string; provider: string; demo_mode: boolean };
