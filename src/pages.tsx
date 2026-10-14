import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  House,
  ListChecks,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { api, post } from "./api";
import {
  Badge,
  ConfirmDialog,
  dateTime,
  Empty,
  ErrorState,
  EventRow,
  EvidenceLinks,
  Loading,
  Logo,
  PageHeading,
  Panel,
  Status,
  TaskRow,
  time,
} from "./components";
import type {
  Action,
  Dashboard,
  Health,
  HomeEvent,
  Ledger,
  Routine,
  Task,
  Workflow,
} from "./types";

const demoPrompt =
  "Prepare my father's evening routine, review today's simulated front-door events, identify pending tasks, and prepare a family update.";
const starterPrompts = [
  "Prepare the evening routine.",
  "What tasks are still pending?",
  "Review recent simulated home events.",
  "Prepare a family update.",
  "Explain why this task needs attention.",
];
function useRefresh() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}
function useTaskToggle() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (task: Task) =>
      api<Task>(`/routines/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: task.status === "completed" ? "pending" : "completed",
        }),
      }),
    onSuccess: refresh,
  });
}

export function Overview() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
    refetchInterval: 30000,
  });
  const toggle = useTaskToggle();
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const data = query.data;
  const next = data.tasks.find((t) => t.status === "pending");
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).format(new Date(data.current_time)),
  );
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE CLARITY FOR YOUR EVERYDAY"
        title={`${greeting}, Maya.`}
        description={new Date(
          `${data.today}T12:00:00+05:30`,
        ).toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })}
        action={
          <Link className="button primary" to="/assistant">
            <Sparkles size={17} />
            Ask NOVA
            <ArrowUpRight size={16} />
          </Link>
        }
      />
      <div className="hero">
        <div className="hero-content">
          <Badge tone="blue">
            <Sparkles size={12} />
            YOUR FAMILY, IN SYNC
          </Badge>
          <h2>
            Less to keep in mind.
            <br />
            More time to be there.
          </h2>
          <p>
            A clear plan for Arun’s evening, grounded in the
            <br className="desktop-break" /> records you have. You decide what
            happens next.
          </p>
          <Link className="button primary" to="/assistant?demo=1">
            Prepare the evening routine
            <ArrowRight size={17} />
          </Link>
          <span className="hero-footnote">
            Local demo · No live devices or external messages
          </span>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-center">
            <Logo />
          </div>
          <div className="floating-card card-plan">
            <ListChecks size={16} />
            <div>
              Evening routine<small>Plan with evidence</small>
            </div>
            <CheckCircle2 size={16} />
          </div>
          <div className="floating-card card-approval">
            <ShieldCheck size={16} />
            <div>
              You’re in control<small>Approve before acting</small>
            </div>
          </div>
          <span className="orbit-dot dot-one" />
          <span className="orbit-dot dot-two" />
        </div>
      </div>
      <div className="stats-grid">
        {[
          {
            label: "Scheduled today",
            value: data.total,
            icon: CalendarIcon,
            detail: "Tasks from today’s schedule",
            tone: "blue",
          },
          {
            label: "Completed",
            value: data.completed,
            icon: CheckCircle2,
            detail: `${data.pending} tasks still pending`,
            tone: "green",
          },
          {
            label: "Needs attention",
            value: data.attention,
            icon: TriangleAlert,
            detail: "High priority or overdue",
            tone: "red",
          },
          {
            label: "Awaiting approval",
            value: data.approvals,
            icon: ShieldCheck,
            detail: "Your review comes first",
            tone: "amber",
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">
              {s.label}
              <span className={`stat-icon ${s.tone}`}>
                <s.icon size={17} />
              </span>
            </div>
            <strong>{s.value.toString().padStart(2, "0")}</strong>
            <small>{s.detail}</small>
          </div>
        ))}
      </div>
      <div className="overview-columns">
        <Panel
          title="Today’s rhythm"
          caption="Arun’s routine · Asia/Kolkata"
          link={{ to: "/routines", text: "View routines" }}
        >
          <div className="routine-progress">
            <span>
              {data.completed} of {data.total} complete
            </span>
            <span>
              {data.total ? Math.round((data.completed / data.total) * 100) : 0}
              %
            </span>
          </div>
          <div className="progress-track">
            <div
              style={{
                width: `${data.total ? (data.completed / data.total) * 100 : 0}%`,
              }}
            />
          </div>
          {data.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={(t) => toggle.mutate(t)}
              disabled={toggle.isPending}
            />
          ))}
          {toggle.isError && <ErrorState error={toggle.error} />}
        </Panel>
        <div className="right-stack">
          <Panel
            title="Around the home"
            caption="Sample records, never a safety assessment"
            link={{ to: "/events", text: "View all" }}
          >
            {data.events.length ? (
              data.events
                .slice(0, 3)
                .map((event) => <EventRow key={event.id} event={event} />)
            ) : (
              <Empty
                title="No event records available for this period"
                description="Missing records do not establish home security."
              />
            )}
            <div className="notice">
              <TriangleAlert size={15} />
              <p>
                {data.events.some((e) => e.verification === "unavailable")
                  ? "A sensor update is unavailable. Current state is unknown."
                  : "Simulated events cannot establish home security."}
              </p>
            </div>
          </Panel>
          <div className="next-card">
            <div className="next-icon">
              <Clock3 size={21} />
            </div>
            <div>
              <span className="eyebrow">NEXT PENDING ROUTINE</span>
              <h3>{next?.title || "All today’s tasks completed"}</h3>
              <p>
                {next
                  ? `${time(next.scheduled_at)} · ${next.priority} priority`
                  : "Review tomorrow’s plans with your family."}
              </p>
            </div>
            <Link aria-label="View next routine" to="/routines">
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </div>
      <Panel
        title="Recent actions"
        caption="Proposals and verified outcomes are tracked separately"
        link={{ to: "/history", text: "Activity history" }}
      >
        {data.actions.length ? (
          <div className="recent-actions">
            {data.actions.slice(0, 3).map((a) => (
              <Link key={a.id} to="/actions" className="recent-action">
                <div className="action-small-icon">
                  <FileText size={18} />
                </div>
                <div>
                  <strong>{a.title}</strong>
                  <small>
                    {a.result || "Draft prepared. No delivery yet."}
                  </small>
                </div>
                <Status value={a.status} />
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="quiet-empty">
            <WorkflowIcon size={18} />
            <p>
              No actions yet. Start the evening demo to create your first
              evidence-backed plan.
            </p>
            <Link className="text-link" to="/assistant?demo=1">
              Start demo
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </Panel>
    </>
  );
}
function CalendarIcon(props: { size?: number }) {
  return <ListChecks {...props} />;
}

const chatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Enter a request.")
    .max(2000, "Use 2,000 characters or fewer."),
});
type ChatForm = z.infer<typeof chatSchema>;
export function Assistant() {
  const [params, setParams] = useSearchParams();
  const [scenario, setScenario] = useState<
    "normal" | "missing" | "unavailable"
  >("normal");
  const workflows = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api<Workflow[]>("/workflows"),
  });
  const actions = useQuery({
    queryKey: ["actions"],
    queryFn: () => api<Action[]>("/actions"),
  });
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
  });
  const refresh = useRefresh();
  const form = useForm<ChatForm>({
    resolver: zodResolver(chatSchema),
    defaultValues: { message: params.get("demo") ? demoPrompt : "" },
  });
  const mutation = useMutation({
    mutationFn: ({ message }: ChatForm) =>
      post<Workflow>("/chat", { message, scenario }),
    onSuccess: () => {
      form.reset({ message: "" });
      setParams({});
      void refresh();
    },
  });
  const latest = workflows.data?.[0];
  return (
    <>
      <PageHeading
        eyebrow="YOUR LOCAL COORDINATION PARTNER"
        title="A thoughtful plan. A clear reason."
        description="Ask in your own words. NOVA uses a deterministic, allowlisted tool engine."
      />
      <div className="assistant-layout">
        <section className="chat-panel">
          <div className="chat-header">
            <div className="assistant-avatar">
              <Sparkles size={20} />
            </div>
            <div>
              <strong>NOVA Assistant</strong>
              <small>Deterministic mode · no external AI API</small>
            </div>
            <Badge tone="success">Local</Badge>
          </div>
          <div className="conversation" aria-live="polite">
            {workflows.isPending ? (
              <Loading label="Reading saved conversations…" />
            ) : workflows.isError ? (
              <ErrorState error={workflows.error} />
            ) : !workflows.data.length ? (
              <div className="welcome">
                <div className="welcome-symbol">
                  <Logo />
                </div>
                <h2>What can we take off your mind?</h2>
                <p>
                  I can organize routines, inspect simulated records, and
                  prepare an update for you to review.
                </p>
                <div className="starter-grid">
                  {starterPrompts.map((prompt, i) => (
                    <button
                      key={prompt}
                      className="starter"
                      onClick={() => form.setValue("message", prompt)}
                    >
                      <span>
                        {
                          [
                            <ListChecks size={17} />,
                            <Clock3 size={17} />,
                            <House size={17} />,
                            <MessageSquare size={17} />,
                            <ShieldCheck size={17} />,
                          ][i]
                        }
                      </span>
                      {prompt}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="workflow-list">
                {[...workflows.data].reverse().map((w) => (
                  <WorkflowCard
                    key={w.id}
                    workflow={w}
                    action={actions.data?.find(
                      (a) => a.id === w.response.action_id,
                    )}
                  />
                ))}
                <button
                  className="text-link"
                  onClick={() => form.setValue("message", demoPrompt)}
                >
                  Prepare another evening plan
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
          {mutation.isError && <ErrorState error={mutation.error} />}
          <form
            className="composer"
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
          >
            <label className="sr-only" htmlFor="message">
              Message NOVA
            </label>
            <textarea
              id="message"
              placeholder="Ask NOVA to organize your family’s day…"
              maxLength={2000}
              {...form.register("message")}
              disabled={mutation.isPending}
            />
            {form.formState.errors.message && (
              <p className="form-error" role="alert">
                {form.formState.errors.message.message}
              </p>
            )}
            <div className="composer-bottom">
              <label className="scenario-control">
                Demo scenario
                <select
                  aria-label="Demo scenario"
                  value={scenario}
                  onChange={(e) =>
                    setScenario(e.target.value as typeof scenario)
                  }
                  disabled={mutation.isPending}
                >
                  <option value="normal">Normal records</option>
                  <option value="missing">Missing records</option>
                  <option value="unavailable">Unavailable source</option>
                </select>
              </label>
              <button
                className="send-button"
                type="submit"
                aria-label="Send request"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <span className="spinner" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            {mutation.isPending && (
              <p className="composer-status" role="status">
                Running backend tools. The persisted execution trace will appear
                when the request returns.
              </p>
            )}
            <small>Fictional data only. Actions require your approval.</small>
          </form>
        </section>
        <aside className="context-column">
          <Panel
            title="The Trust Loop"
            caption="A visible path from request to outcome"
          >
            <TrustLoop
              status={latest?.status}
              hasAction={!!latest?.response.action_id}
            />
            <p className="context-explanation">
              Observed facts, derived rules, and suggestions stay
              distinguishable.
            </p>
          </Panel>
          <Panel
            title="Routine context"
            caption="Arun Mehta · fictional household"
          >
            {dashboard.data ? (
              <>
                <div className="context-count">
                  <strong>{dashboard.data.pending}</strong>
                  <span>pending tasks today</span>
                </div>
                {dashboard.data.tasks
                  .filter((t) => t.status === "pending")
                  .slice(0, 3)
                  .map((t) => (
                    <div className="context-task" key={t.id}>
                      <span>{t.title}</span>
                      <small>{time(t.scheduled_at)}</small>
                    </div>
                  ))}
              </>
            ) : (
              <p>Context unavailable.</p>
            )}
            <Link className="text-link" to="/routines">
              Open routines
              <ArrowUpRight size={14} />
            </Link>
          </Panel>
          <Panel title="Approval queue">
            <div className="approval-context">
              <ShieldCheck size={24} />
              <div>
                <strong>
                  {actions.data?.filter((a) => a.status === "awaiting_approval")
                    .length || 0}{" "}
                  pending reviews
                </strong>
                <p>No external messages are sent.</p>
              </div>
            </div>
            <Link className="button secondary full" to="/actions">
              Open Action Center
              <ArrowRight size={15} />
            </Link>
          </Panel>
          <div className="context-disclaimer">
            <Badge tone="simulation">SIMULATED HOME DATA</Badge>
            <p>
              No device connection. Missing records are never proof of safety.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function TrustLoop({
  status,
  hasAction,
}: {
  status?: string;
  hasAction: boolean;
}) {
  return (
    <div className="trust-loop">
      {[
        {
          title: "PLAN",
          text: "Prioritize actual pending tasks",
          done: !!status,
        },
        {
          title: "VERIFY",
          text: "Check records and limitations",
          done: !!status,
        },
        {
          title: "ASK",
          text: hasAction
            ? "Explicit approval required"
            : "No consequential action proposed",
          done: !!status && status !== "awaiting_approval",
        },
        {
          title: "PROVE",
          text:
            status === "completed" && hasAction
              ? "Persisted outcome verified"
              : status === "rejected"
                ? "Rejected · nothing executed"
                : status === "failed"
                  ? "Failed · inspect execution trace"
                  : "Show the actual recorded outcome",
          done: status === "completed" && hasAction,
        },
      ].map((stage, i) => (
        <div
          className={`trust-stage ${stage.done ? "stage-done" : ""}`}
          key={stage.title}
        >
          <span>{stage.done ? <Check size={13} /> : i + 1}</span>
          <div>
            <strong>{stage.title}</strong>
            <p>{stage.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
function WorkflowCard({
  workflow: w,
  action,
}: {
  workflow: Workflow;
  action?: Action;
}) {
  return (
    <article className="workflow-card">
      <div className="user-message">
        <span className="avatar small">M</span>
        <p>{w.request}</p>
      </div>
      <div className="assistant-response">
        <div className="response-label">
          <Sparkles size={15} />
          NOVA
          <Status value={action?.status || w.status} />
          <small>{dateTime(w.created_at)}</small>
        </div>
        <p className="response-summary">{w.response.summary}</p>
        <div className="fact-list">
          {w.response.facts.map((fact, i) => (
            <p key={i}>
              <Badge tone={fact.kind === "observed" ? "blue" : "neutral"}>
                {fact.kind}
              </Badge>
              {fact.text}
            </p>
          ))}
        </div>
        {w.response.plan.length > 0 && (
          <div className="plan-list">
            {w.response.plan.map((step, i) => (
              <div className="plan-card" key={i}>
                <div className="plan-number">{i + 1}</div>
                <div>
                  <div className="plan-title">
                    <h3>{step.title}</h3>
                    <Badge
                      tone={step.priority === "high" ? "danger" : "neutral"}
                    >
                      {step.priority}
                    </Badge>
                  </div>
                  <details>
                    <summary>Explain this result</summary>
                    <p>{step.explanation}</p>
                    <EvidenceLinks records={step.evidence} />
                    {step.dependencies.length > 0 && (
                      <p>Depends on: {step.dependencies.join(", ")}</p>
                    )}
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
        {w.response.limitations.length > 0 && (
          <div className="limitations">
            <TriangleAlert size={16} />
            <div>
              <strong>What we can’t verify</strong>
              {w.response.limitations.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </div>
          </div>
        )}
        {action && (
          <div className="draft-callout">
            <FileText size={19} />
            <div>
              <strong>
                {action.status === "awaiting_approval"
                  ? "Family update ready for review"
                  : `Family update · ${action.status}`}
              </strong>
              <p>{action.result || "Draft only. No delivery has occurred."}</p>
            </div>
            <Link className="text-link" to="/actions">
              Review
              <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <details className="execution-trace">
          <summary>
            Actual tool execution · {w.steps.length} recorded steps
          </summary>
          <ol>
            {w.steps.map((s) => (
              <li key={s.position}>
                <div>
                  <code>{s.tool_name}</code>
                  <Status value={s.status} />
                </div>
                <p>{s.output.summary}</p>
                <small>{dateTime(s.created_at)}</small>
              </li>
            ))}
          </ol>
          <small>Workflow {w.id}</small>
        </details>
      </div>
    </article>
  );
}

export function Routines() {
  const query = useQuery({
    queryKey: ["routines"],
    queryFn: () => api<Routine[]>("/routines/today"),
  });
  const [filter, setFilter] = useState("all");
  const [params] = useSearchParams();
  const toggle = useTaskToggle();
  const [editing, setEditing] = useState<Task | null>(null);
  const [notes, setNotes] = useState("");
  const refresh = useRefresh();
  const save = useMutation({
    mutationFn: () =>
      api<Task>(`/routines/${editing?.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      }),
    onSuccess: () => {
      setEditing(null);
      void refresh();
    },
  });
  useEffect(() => {
    if (query.data && params.get("record"))
      document
        .getElementById(`task-${params.get("record")}`)
        ?.scrollIntoView({ block: "center" });
  }, [query.data, params]);
  return (
    <>
      <PageHeading
        eyebrow="SMALL ROUTINES. SHARED RESPONSIBILITY."
        title="Today’s rhythm"
        description="Coordinate Arun’s day. Task changes are saved to your local database."
      />
      <FilterTabs
        value={filter}
        onChange={setFilter}
        options={[
          ["all", "All tasks"],
          ["pending", "Pending"],
          ["completed", "Completed"],
          ["attention", "Needs attention"],
        ]}
      />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : (
        query.data.map((routine) => (
          <Panel
            key={routine.id}
            title={routine.title}
            caption={routine.person}
          >
            {routine.tasks
              .filter(
                (t) =>
                  filter === "all" ||
                  (filter === "attention"
                    ? t.needs_attention
                    : t.status === filter),
              )
              .map((task) => (
                <div
                  key={task.id}
                  className={
                    params.get("record") === String(task.id)
                      ? "record-highlight"
                      : ""
                  }
                >
                  <TaskRow
                    task={task}
                    onToggle={(t) => toggle.mutate(t)}
                    disabled={toggle.isPending}
                  />
                  <div className="task-extras">
                    {task.needs_attention && (
                      <Badge tone="warning">
                        Needs attention · high priority or overdue
                      </Badge>
                    )}
                    <button
                      className="text-link"
                      onClick={() => {
                        setEditing(task);
                        setNotes(task.notes);
                      }}
                    >
                      Edit notes
                    </button>
                    {task.notes && <span>{task.notes}</span>}
                  </div>
                </div>
              ))}
            {routine.tasks.filter(
              (t) =>
                filter === "all" ||
                (filter === "attention"
                  ? t.needs_attention
                  : t.status === filter),
            ).length === 0 && (
              <Empty
                title="No tasks in this view"
                description="Try a different filter."
              />
            )}
          </Panel>
        ))
      )}
      {toggle.isError && <ErrorState error={toggle.error} />}{" "}
      {editing && (
        <div className="note-editor panel">
          <h2>Notes · {editing.title}</h2>
          <label htmlFor="notes">Optional notes (fictional data only)</label>
          <textarea
            id="notes"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              Save notes
            </button>
          </div>
          {save.isError && <ErrorState error={save.error} />}
        </div>
      )}
    </>
  );
}
function FilterTabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <div className="filter-tabs" aria-label="Filter records">
      {options.map(([key, label]) => (
        <button
          aria-pressed={value === key}
          className={value === key ? "selected" : ""}
          key={key}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Events() {
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [offset, setOffset] = useState(0);
  const [params] = useSearchParams();
  const query = useQuery({
    queryKey: ["events", category, severity, offset],
    queryFn: () =>
      api<HomeEvent[]>(
        `/events?limit=20&offset=${offset}${category ? `&category=${category}` : ""}${severity ? `&severity=${severity}` : ""}`,
      ),
  });
  useEffect(() => {
    if (query.data && params.get("record"))
      document
        .getElementById(`event-${params.get("record")}`)
        ?.scrollIntoView({ block: "center" });
  }, [query.data, params]);
  return (
    <>
      <PageHeading
        eyebrow="OBSERVATIONS WITH LIMITS"
        title="Around the home"
        description="An explicitly simulated event timeline. No Ring or other device is connected."
      />
      <div className="simulation-banner">
        <House size={20} />
        <div>
          <strong>SIMULATED HOME DATA</strong>
          <p>
            These are fictional local fixtures. Door closure and absent alerts
            never establish property security.
          </p>
        </div>
      </div>
      <div className="filter-row">
        <label>
          Category
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All categories</option>
            <option value="door">Front door</option>
            <option value="check-in">Check-in</option>
            <option value="sensor">Sensor</option>
          </select>
        </label>
        <label>
          Severity
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All severities</option>
            <option value="info">Information</option>
            <option value="warning">Warning</option>
          </select>
        </label>
      </div>
      <Panel title="Event timeline" caption="Times shown in Asia/Kolkata">
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : query.data.length ? (
          query.data.map((event) => (
            <div
              className={
                params.get("record") === String(event.id)
                  ? "record-highlight"
                  : ""
              }
              key={event.id}
            >
              <EventRow event={event} />
              <div className="event-source">
                {event.source} · Severity: {event.severity} ·{" "}
                {dateTime(event.timestamp)}
              </div>
            </div>
          ))
        ) : (
          <Empty
            title="No event records available for this period"
            description="No conclusion about safety can be drawn from missing records."
          />
        )}
        <Pagination
          offset={offset}
          setOffset={setOffset}
          count={query.data?.length || 0}
        />
      </Panel>
    </>
  );
}

export function Actions() {
  const query = useQuery({
    queryKey: ["actions"],
    queryFn: () => api<Action[]>("/actions"),
  });
  const [selected, setSelected] = useState<Action | null>(null);
  const [filter, setFilter] = useState("all");
  const refresh = useRefresh();
  const mutation = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "approve" | "reject";
    }) =>
      post<Action>(
        `/actions/${id}/${decision}`,
        decision === "approve" ? { confirmed: true } : {},
      ),
    onSuccess: () => {
      setSelected(null);
      void refresh();
    },
  });
  return (
    <>
      <PageHeading
        eyebrow="YOU HAVE THE FINAL SAY"
        title="Action Center"
        description="Review the evidence, expected effect, and draft before approving an action."
      />
      <FilterTabs
        value={filter}
        onChange={setFilter}
        options={[
          ["all", "All actions"],
          ["awaiting_approval", "Awaiting approval"],
          ["completed", "Completed"],
          ["rejected", "Rejected"],
          ["failed", "Failed"],
        ]}
      />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : !query.data.filter((a) => filter === "all" || a.status === filter)
          .length ? (
        <Panel title="Your review queue">
          <Empty
            title="No actions in this view"
            description="Ask NOVA to prepare a family update to create a reviewable proposal."
          />
          <Link className="button primary" to="/assistant?demo=1">
            Start evening demo
            <ArrowRight size={15} />
          </Link>
        </Panel>
      ) : (
        query.data
          .filter((a) => filter === "all" || a.status === filter)
          .map((action) => (
            <article className="panel action-card" key={action.id}>
              <div className="action-card-heading">
                <span className="action-icon">
                  <FileText size={23} />
                </span>
                <div>
                  <h2>{action.title}</h2>
                  <small>
                    {dateTime(action.created_at)} · Workflow{" "}
                    {action.workflow_id.slice(0, 8)}
                  </small>
                </div>
                <Status value={action.status} />
              </div>
              <div className="action-details">
                <div>
                  <span className="eyebrow">WHY THIS ACTION</span>
                  <p>{action.reason}</p>
                  <span className="eyebrow">EXPECTED EFFECT</span>
                  <p>{action.expected_effect}</p>
                  <Badge tone="blue">
                    {action.external_state
                      ? "Changes external state"
                      : "Local simulation only · no external state change"}
                  </Badge>
                  <details className="action-evidence">
                    <summary>
                      Supporting records · {action.evidence.length}
                    </summary>
                    <EvidenceLinks records={action.evidence} />
                  </details>
                </div>
                <div className="draft-preview">
                  <div>
                    <FileText size={14} />
                    <strong>Family update draft</strong>
                    <Badge>Simulated</Badge>
                  </div>
                  <p>{action.payload.message}</p>
                </div>
              </div>
              {action.result && (
                <div
                  className={`action-result ${action.status === "failed" ? "failed" : ""}`}
                >
                  <ShieldCheck size={18} />
                  <div>
                    <strong>Recorded outcome</strong>
                    <p>{action.result}</p>
                  </div>
                </div>
              )}
              <div className="action-footer">
                {action.status === "awaiting_approval" ? (
                  <>
                    <p>
                      Approval permits execution. Success is reported after
                      persistence is verified.
                    </p>
                    <button
                      className="button secondary"
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({ id: action.id, decision: "reject" })
                      }
                    >
                      Reject
                    </button>
                    <button
                      className="button primary"
                      disabled={mutation.isPending}
                      onClick={() => setSelected(action)}
                    >
                      <Check size={16} />
                      Review & approve
                    </button>
                  </>
                ) : (
                  <>
                    <p>Last updated {dateTime(action.updated_at)}</p>
                    <Link className="text-link" to="/history">
                      View recorded history
                      <ArrowUpRight size={15} />
                    </Link>
                  </>
                )}
              </div>
            </article>
          ))
      )}
      {mutation.isError && <ErrorState error={mutation.error} />}
      <ConfirmDialog
        open={!!selected}
        title="Approve this local simulated delivery?"
        description="This will execute the backend service and create one record in the local simulated family inbox. No external message is sent. Repeated approvals cannot create a second delivery."
        onConfirm={() =>
          selected && mutation.mutate({ id: selected.id, decision: "approve" })
        }
        onClose={() => {
          if (!mutation.isPending) setSelected(null);
        }}
        pending={mutation.isPending}
      />
    </>
  );
}

function Pagination({
  offset,
  setOffset,
  count,
}: {
  offset: number;
  setOffset: (n: number) => void;
  count: number;
}) {
  return (
    <div className="pagination">
      <button
        className="button secondary small"
        disabled={offset === 0}
        onClick={() => setOffset(Math.max(0, offset - 20))}
      >
        Previous
      </button>
      <span>Page {offset / 20 + 1}</span>
      <button
        className="button secondary small"
        disabled={count < 20}
        onClick={() => setOffset(offset + 20)}
      >
        Next
      </button>
    </div>
  );
}
export function History() {
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ["history", status, offset],
    queryFn: () =>
      api<Ledger[]>(
        `/history?limit=20&offset=${offset}${status ? `&status=${status}` : ""}`,
      ),
  });
  return (
    <>
      <PageHeading
        eyebrow="THE RECORD OF WHAT ACTUALLY HAPPENED"
        title="Activity History"
        description="Persistent, server-timestamped tool results and action decisions. Times shown in Asia/Kolkata."
      />
      <div className="filter-row">
        <label>
          Execution status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All outcomes</option>
            {["completed", "approved", "executing", "failed", "rejected"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <Panel
        title="Action ledger"
        caption="Approval and execution are recorded independently"
      >
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : !query.data.length ? (
          <Empty
            title="No ledger entries in this view"
            description="Tool executions and direct task changes appear here."
          />
        ) : (
          <div className="ledger-list">
            {query.data.map((entry) => (
              <article className="ledger-entry" key={entry.id}>
                <div
                  className={`ledger-dot ${entry.execution_status === "failed" ? "failed" : ""}`}
                />
                <div>
                  <div className="ledger-title">
                    <code>{entry.tool_name}</code>
                    <Status value={entry.execution_status} />
                  </div>
                  <p>{entry.result}</p>
                  <div className="ledger-meta">
                    <span>{dateTime(entry.timestamp)}</span>
                    <span>
                      Approval: {entry.approval_status.replaceAll("_", " ")}
                    </span>
                    <span>
                      Workflow:{" "}
                      {entry.workflow_id?.slice(0, 8) || "Direct task change"}
                    </span>
                    <span>Record #{entry.id}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination
          offset={offset}
          setOffset={setOffset}
          count={query.data?.length || 0}
        />
      </Panel>
    </>
  );
}

export function SettingsPage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
  });
  const [confirm, setConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const refresh = useRefresh();
  const reset = useMutation({
    mutationFn: () => post("/demo/reset", { confirmed: true }),
    onSuccess: () => {
      setConfirm(false);
      setResetDone(true);
      void refresh();
    },
  });
  return (
    <>
      <PageHeading
        eyebrow="CLEAR BOUNDARIES. SIMPLE CONTROLS."
        title="Settings"
        description="Everything essential runs on this computer with fictional sample data."
      />
      <div className="settings-grid">
        <Panel title="Application">
          <div className="setting-row">
            <strong>NOVA Care</strong>
            <Badge>v1.0.0</Badge>
          </div>
          <p>Notice. Organize. Verify. Act.</p>
          <div className="setting-row">
            <span>Experience</span>
            <Badge tone="blue">Alexa+ simulation</Badge>
          </div>
          <div className="setting-row">
            <span>Demo mode</span>
            <Status value="connected" />
          </div>
          <p className="muted">
            No live Amazon, Ring, Alexa+, or messaging integration. No AWS or
            paid API is used.
          </p>
        </Panel>
        <Panel title="AI & backend">
          <div className="setting-row">
            <span>Provider</span>
            <Badge>Deterministic local engine</Badge>
          </div>
          <div className="setting-row">
            <span>Backend</span>
            <Status value={health.isSuccess ? "connected" : "unavailable"} />
          </div>
          <p>
            Intent routing uses validated rules and an explicit tool allowlist.
            Ollama and MCP are optional extensions and are not implemented in
            this release.
          </p>
          <p className="muted">
            No model downloads, external AI requests, or API keys.
          </p>
        </Panel>
        <Panel title="Privacy & limitations">
          <div className="privacy-line">
            <ShieldCheck size={22} />
            <p>
              Fictional household records are stored locally in SQLite. Use the
              demo only with sample information.
            </p>
          </div>
          <p>
            This is a local, single-user demonstration without authentication or
            production security certification. It does not assess home security
            or provide medical advice. The action ledger is persistent but is
            not tamper-proof.
          </p>
          <p className="muted">
            Routine dates stay fixed after initialization. Reset explicitly to
            create fixtures for today; restarting never replaces your data.
          </p>
        </Panel>
        <Panel title="Reset demonstration">
          <p>
            Replace routines and events with today’s fixtures. This deletes
            local conversations, actions, approvals, inbox deliveries, and
            history.
          </p>
          <button className="button danger" onClick={() => setConfirm(true)}>
            Reset demo data
          </button>
          {resetDone && (
            <p role="status" className="success-text">
              Demo reset completed. Today’s fixtures are ready.
            </p>
          )}
          {reset.isError && <ErrorState error={reset.error} />}
        </Panel>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Replace all local demo data?"
        description="All existing local records will be deleted and replaced with today’s fictional fixtures. This cannot be undone."
        onConfirm={() => reset.mutate()}
        onClose={() => {
          if (!reset.isPending) setConfirm(false);
        }}
        pending={reset.isPending}
        danger
      />
    </>
  );
}
