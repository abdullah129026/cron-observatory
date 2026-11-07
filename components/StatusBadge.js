// Status badge: shape plus color plus text, never color alone.
// data-state matches components.css (timed_out renders as timedout).
const LABELS = {
  new: "New",
  up: "Up",
  late: "Late",
  down: "Down",
  timed_out: "Timed out",
};

const RUN_LABELS = {
  success: "Success",
  failed: "Failed",
  timed_out: "Timed out",
  running: "Running",
  missed: "Missed",
};

function shape(status) {
  if (status === "up" || status === "success") {
    return (<><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>);
  }
  if (status === "late" || status === "timed_out") {
    return (<><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 4.8V8l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>);
  }
  if (status === "down" || status === "failed") {
    return (<path d="M5.2 2.8h5.6l2.4 2.4v5.6l-2.4 2.4H5.2l-2.4-2.4V5.2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />);
  }
  return <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />;
}

export function statusLabel(status) {
  return LABELS[status] ?? status;
}

export function runLabel(status) {
  return RUN_LABELS[status] ?? status;
}

export default function StatusBadge({ status, pill = false }) {
  const state = status === "timed_out" ? "timedout" : status;
  return (
    <span className={pill ? "status-pill" : "status"} data-state={state}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">{shape(status)}</svg>
      {statusLabel(status)}
    </span>
  );
}

export function RunBadge({ status }) {
  const state = status === "timed_out" ? "timedout" : status === "success" ? "up" : status === "failed" ? "down" : status;
  return (
    <span className="status" data-state={state}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">{shape(status)}</svg>
      {runLabel(status)}
    </span>
  );
}
