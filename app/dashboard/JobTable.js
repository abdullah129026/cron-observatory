"use client";

// Dashboard job table: urgency-sorted rows from the server, refreshed
// every 30 seconds from the jobs API. When a job's first success ping
// lands while the page is open, a toast says so and the row turns green.
// Row click goes to the job detail page.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge.js";
import TickStrip from "@/components/TickStrip.js";
import SnippetCard from "@/components/SnippetCard.js";
import { showToast } from "@/components/Toasts.js";
import { relTime, fmtDuration } from "@/lib/format.js";

function cell(value) {
  return value ?? <span className="dash">—</span>;
}

export default function JobTable({ initialJobs, projectId, projectName }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const prev = useRef(new Map(initialJobs.map((j) => [j.id, j.status])));

  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const res = await fetch(`/api/projects/${projectId}/jobs`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive || !Array.isArray(data.jobs)) return;
        for (const job of data.jobs) {
          const before = prev.current.get(job.id);
          if (before === "new" && job.status === "up") {
            showToast("success", `Nice work, ${job.name} is monitored.`);
          }
          prev.current.set(job.id, job.status);
        }
        setJobs(data.jobs);
      } catch { /* a failed refresh keeps the last good rows */ }
    }
    const timer = setInterval(refresh, 30000);
    return () => { alive = false; clearInterval(timer); };
  }, [projectId]);

  if (!jobs || jobs.length === 0) {
    return (
      <div className="card">
        <div className="card-header"><span className="card-title">Waiting for your first ping</span></div>
        <SnippetCard projectId={projectId} projectName={projectName} initialKey={null} />
        <p className="caption" style={{ marginTop: 12 }}>Your first start ping creates the first row.</p>
        <Link href="/docs" className="link">Read the docs</Link>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Job</th>
            <th>Failures</th>
            <th>Last run</th>
            <th>Next expected</th>
            <th>Avg duration (7d)</th>
            <th>History</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} onClick={() => router.push(`/jobs/${job.id}`)} style={{ cursor: "pointer" }}>
              <td><StatusBadge status={job.status} /></td>
              <td>
                <Link href={`/jobs/${job.id}`} className="job-name" onClick={(e) => e.stopPropagation()}>
                  {job.name}
                </Link>
                <span className="sub mono">{job.schedule ? `${job.schedule} · ${job.timezone}` : "no schedule"}</span>
              </td>
              <td className="num">{job.status === "new" ? <span className="dash">—</span> : job.failures}</td>
              <td className="num">{cell(job.last_run_at && relTime(job.last_run_at))}</td>
              <td className="num">{cell(job.next_expected_run && relTime(job.next_expected_run))}</td>
              <td className="num">{cell(job.avg_duration_ms_7d != null && fmtDuration(job.avg_duration_ms_7d))}</td>
              <td><TickStrip strip={job.tick_strip} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
