// 30-day tick strip: one tick per day, colored by the worst status
// that day, hollow for no runs. Each tick names its date and status.
import { statusLabel } from "./StatusBadge.js";

export default function TickStrip({ strip }) {
  return (
    <span className="tick-strip">
      {strip.map((t) => (
        <span key={t.date} className="tick" data-day={t.status} title={`${t.date}: ${t.status === "none" ? "no runs" : statusLabel(t.status)}`} />
      ))}
    </span>
  );
}

// Hollow strip for the honest waiting state: no runs yet, no fake data.
export function HollowStrip({ days = 30 }) {
  const today = new Date();
  const ticks = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    ticks.push(<span key={d} className="tick" data-day="none" title={`${d}: no runs`} />);
  }
  return <span className="tick-strip">{ticks}</span>;
}
