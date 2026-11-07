"use client";

// Duration chart: a plain-SVG p50 line, hairline grid, mono axis
// labels. Window selector above the chart (24h, 7d, 30d). No new
// dependency, no gradients.
import { useState } from "react";
import { bucketP50, chartWindows } from "@/lib/chart.js";
import { fmtDuration } from "@/lib/format.js";

const W = 640;
const H = 180;
const PAD = { left: 48, right: 8, top: 12, bottom: 24 };

export default function DurationChart({ runs }) {
  const [windowKey, setWindowKey] = useState("7d");
  const finished = runs.filter((r) => r.duration_ms != null && (r.status === "success" || r.status === "failed"));

  if (finished.length < 2) {
    return <p className="chart-empty">Duration chart needs at least 2 finished runs.</p>;
  }

  const buckets = bucketP50(runs, windowKey);
  const max = Math.max(...buckets.map((b) => b.p50 ?? 0));
  const x = (i) => PAD.left + (i / Math.max(1, buckets.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v) => PAD.top + (1 - v / (max || 1)) * (H - PAD.top - PAD.bottom);

  // Split the line at empty buckets so gaps stay gaps.
  const segments = [];
  let current = [];
  buckets.forEach((b, i) => {
    if (b.p50 == null) {
      if (current.length > 1) segments.push(current);
      current = [];
    } else {
      current.push([x(i), y(b.p50)]);
    }
  });
  if (current.length > 1) segments.push(current);

  const mid = Math.floor(buckets.length / 2);

  return (
    <div className="chart-wrap">
      <div className="window-picker" style={{ marginBottom: 12 }}>
        {chartWindows().map((w) => (
          <button
            key={w}
            type="button"
            className={w === windowKey ? "btn btn-sm" : "btn-secondary btn-sm"}
            onClick={() => setWindowKey(w)}
            aria-pressed={w === windowKey}
          >
            {w}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`p50 job duration, ${windowKey} window`}>
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={PAD.left} x2={W - PAD.right} y1={y(max * f)} y2={y(max * f)} style={{ stroke: "var(--line)", strokeWidth: 1 }} />
        ))}
        <text x={PAD.left - 8} y={y(max) + 4} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="var(--ink-3)">{fmtDuration(max)}</text>
        <text x={PAD.left - 8} y={y(max / 2) + 4} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="var(--ink-3)">{fmtDuration(max / 2)}</text>
        <text x={PAD.left - 8} y={y(0) + 4} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="var(--ink-3)">0</text>
        {segments.map((seg, i) => (
          <polyline key={i} points={seg.map(([px, py]) => `${px},${py}`).join(" ")} fill="none" style={{ stroke: "var(--ink)", strokeWidth: 1.5 }} />
        ))}
        <text x={x(0)} y={H - 6} fontSize="11" fontFamily="var(--font-mono)" fill="var(--ink-3)">{buckets[0]?.label}</text>
        <text x={x(mid)} y={H - 6} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--ink-3)">{buckets[mid]?.label}</text>
        <text x={x(buckets.length - 1)} y={H - 6} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="var(--ink-3)">{buckets[buckets.length - 1]?.label}</text>
      </svg>
    </div>
  );
}
