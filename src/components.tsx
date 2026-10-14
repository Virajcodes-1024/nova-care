import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  TriangleAlert,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Evidence, HomeEvent, Task } from "./types";

export function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 36 36">
        <path d="M6 28V8l24 20V8" />
        <path className="mark-inner" d="m13 28 10-20" />
      </svg>
    </span>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Status({ value }: { value: string }) {
  const label = value.replaceAll("_", " ");
  return (
    <Badge
      tone={
        ["completed", "recorded", "connected"].includes(value)
          ? "success"
          : ["failed", "high"].includes(value)
            ? "danger"
            : ["awaiting_approval", "warning", "unavailable"].includes(value)
              ? "warning"
              : "neutral"
      }
    >
      {value === "completed" ? (
        <Check size={12} />
      ) : (
        <span className="status-dot" />
      )}
      {label}
    </Badge>
  );
}
export function Panel({
  title,
  caption,
  children,
  link,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
  link?: { to: string; text: string };
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {caption && <p>{caption}</p>}
        </div>
        {link && (
          <Link className="text-link" to={link.to}>
            {link.text}
            <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Loading({
  label = "Reading local records…",
}: {
  label?: string;
}) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error | null;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <TriangleAlert size={20} />
      <div>
        <strong>Couldn’t complete this request</strong>
        <p>{error?.message || "The local backend is unavailable."}</p>
        {retry && (
          <button className="button secondary small" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <CheckCircle2 size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function EvidenceLinks({ records }: { records: Evidence[] }) {
  return (
    <div className="evidence-links">
      {records.map((e) => (
        <Link
          key={`${e.kind}-${e.id}`}
          to={`${e.kind === "task" ? "/routines" : "/events"}?record=${e.id}`}
          title={e.label}
        >
          {e.kind === "task" ? "Task" : "Event"} #{e.id}
          <ArrowUpRight size={12} />
        </Link>
      ))}
    </div>
  );
}
export function time(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}
export function dateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}
export function TaskRow({
  task,
  onToggle,
  disabled = false,
}: {
  task: Task;
  onToggle?: (task: Task) => void;
  disabled?: boolean;
}) {
  return (
    <div
      id={`task-${task.id}`}
      className={`task-row ${task.status === "completed" ? "done" : ""}`}
    >
      <button
        className="task-check"
        disabled={!onToggle || disabled}
        aria-label={`${task.status === "completed" ? "Reopen" : "Complete"} ${task.title}`}
        aria-pressed={task.status === "completed"}
        onClick={() => onToggle?.(task)}
      >
        {task.status === "completed" && <Check size={14} />}
      </button>
      <div className="task-main">
        <strong>{task.title}</strong>
        <span>{task.description}</span>
      </div>
      <div className="task-meta">
        <span>
          <Clock3 size={12} />
          {time(task.scheduled_at)}
        </span>
        <Badge tone={task.priority === "high" ? "danger" : "neutral"}>
          {task.priority} priority
        </Badge>
      </div>
    </div>
  );
}
export function EventRow({ event }: { event: HomeEvent }) {
  return (
    <div className="event-row" id={`event-${event.id}`}>
      <div
        className={`event-marker ${event.severity === "warning" ? "amber" : ""}`}
      >
        {event.severity === "warning" ? (
          <TriangleAlert size={16} />
        ) : (
          <ChevronRight size={16} />
        )}
      </div>
      <div>
        <div className="event-title">
          <strong>
            {event.category === "door"
              ? "Front door"
              : event.category === "sensor"
                ? "Sensor availability"
                : "Family check-in"}
          </strong>
          <span>{time(event.timestamp)}</span>
        </div>
        <p>{event.description}</p>
        <div className="row-badges">
          <Badge>Simulated · #{event.id}</Badge>
          <Status value={event.verification} />
        </div>
      </div>
    </div>
  );
}
export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onClose,
  pending = false,
  danger = false,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-labelledby="confirm-title"
      onClose={onClose}
    >
      <div className="dialog-heading">
        <h2 id="confirm-title">{title}</h2>
        <button
          aria-label="Close confirmation"
          className="icon-button"
          onClick={onClose}
          disabled={pending}
        >
          <X size={20} />
        </button>
      </div>
      <p>{description}</p>
      <div className="dialog-actions">
        <button
          className="button secondary"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          autoFocus
          className={`button ${danger ? "danger" : "primary"}`}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending
            ? "Working…"
            : danger
              ? "Reset demo data"
              : "Confirm approval"}
        </button>
      </div>
    </dialog>
  );
}
