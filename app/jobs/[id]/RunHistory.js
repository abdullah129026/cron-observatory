"use client";

// Run history: 25 rows per page, "Load more" appends the next page.
// Failed rows expand the full log excerpt in place. Missed rows are
// synthetic (from alerts), visually distinct, with no log to show.
import { Fragment, useState } from "react";
import { RunBadge } from "@/components/StatusBadge.js";
import { fmtClock, fmtDuration } from "@/lib/format.js";

export default function RunHistory({ initialRuns, total, jobId }) {
  const [runs, setRuns] = useState(initialRuns);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMore() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/runs?offset=${runs.filter((r) => !r.synthetic).length}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not load more runs.");
      const seen = new Set(runs.map((r) => r.id));
      setRuns((prev) => [...prev, ...data.runs.filter((r) => !seen.has(r.id))]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (runs.length === 0) {
    return (
      <div className="empty">
        <div className="empty-title">No runs yet.</div>
        <p className="empty-body">Runs appear here once the job pings for the first time.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Log</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <Fragment key={run.id}>
                <tr>
                  <td className="num">{fmtClock(run.started_at)}</td>
                  <td>
                    <RunBadge status={run.status} />
                    {run.synthetic === "missed" && <span className="sub">no ping received, from alerts</span>}
                  </td>
                  <td className="num">{run.duration_ms != null ? fmtDuration(run.duration_ms) : <span className="dash">—</span>}</td>
                  <td className="mono">{run.log_excerpt ? run.log_excerpt.split("\n")[0].slice(0, 80) : <span className="dash">—</span>}</td>
                  <td>
                    {run.status === "failed" && run.log_excerpt && (
                      <button type="button" className="btn-text btn-sm" onClick={() => setExpanded(expanded === run.id ? null : run.id)}>
                        {expanded === run.id ? "Hide log" : "View log"}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === run.id && run.log_excerpt && (
                  <tr>
                    <td colSpan={5}><pre className="log">{run.log_excerpt}</pre></td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="field-error" style={{ marginTop: 8 }}>{error}</p>}
      {runs.length < total && (
        <div style={{ marginTop: 12 }}>
          <button type="button" className={`btn btn-secondary${loading ? " is-loading" : ""}`} disabled={loading} onClick={loadMore}>
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
