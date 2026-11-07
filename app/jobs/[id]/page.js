// Job detail (/jobs/[id]). Answers: what happened, and what do I
// do. A bad id and another account's job id render the same frame,
// so existence never leaks.
import { redirect } from "next/navigation";
import Link from "next/link";
import Topbar from "../../../components/Topbar.js";
import AppBanners from "../../../components/AppBanners.js";
import StatusBadge from "../../../components/StatusBadge.js";
import RunHistory from "./RunHistory.js";
import DurationChart from "./DurationChart.js";
import ScheduleForm from "./ScheduleForm.js";
import DeleteJobButton from "./DeleteJobButton.js";
import { getSessionUser, requireOwnJob } from "@/lib/auth.js";
import { createStore } from "@/lib/store.js";
import { isConfigured } from "@/lib/db.js";
import { getJobDetail, getJobRuns } from "@/lib/jobdetail.js";
import { relTime, fmtClock, fmtDuration } from "@/lib/format.js";
import { event } from "@/lib/log.js";

export const dynamic = "force-dynamic";

function NotFound() {
  return (
    <>
      <Topbar variant="app" />
      <main className="wrap">
        <div className="center-card">
          <div className="card">
            <div className="form-stack">
              <h1 className="title">Job not found</h1>
              <p className="muted">This job does not exist or belongs to another account.</p>
              <div><Link href="/dashboard" className="btn">Back to jobs</Link></div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function ServiceDown() {
  return (
    <>
      <Topbar variant="app" />
      <main className="wrap">
        <div className="banner-stack" style={{ marginTop: 32 }}>
          <div className="banner banner-danger" role="alert">
            <span className="banner-body"><span className="banner-title">Could not reach the service.</span></span>
          </div>
        </div>
      </main>
    </>
  );
}

function deliveryOf(alert) {
  if (alert.resolved_at) return `Sent, resolved ${relTime(alert.resolved_at)}`;
  if (alert.sent_at) return `Sent ${relTime(alert.sent_at)}`;
  if (alert.send_failed) return "Failed after 24h";
  return "Queued, retrying";
}

const KIND_LABELS = { failure: "Failure", missed: "Missed", timeout: "Timeout", recovery: "Recovery" };

export default async function JobDetailPage({ params }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isConfigured()) return <ServiceDown />;

  const store = createStore();
  let job;
  let project;
  try {
    ({ job, project } = await requireOwnJob(store, user.id, id));
  } catch {
    return <NotFound />;
  }

  let detail;
  let runsData;
  let chartRuns = [];
  let meta = null;
  let unsent = 0;
  try {
    detail = await getJobDetail(store, job, new Date());
    runsData = await getJobRuns(store, job.id, 0);
    const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
    chartRuns = await store.listRunsInWindow(job.id, since30d);
    meta = await store.getMeta();
    unsent = await store.countUnsentAlerts(project.id);
  } catch {
    return <ServiceDown />;
  }

  event("job_detail_viewed", { job_id: job.id });

  const scheduleText = job.schedule_kind === "cron"
    ? job.cron_expr
    : job.schedule_kind === "interval"
      ? `every ${job.period_seconds}s`
      : "no schedule";
  const { stats } = detail;

  return (
    <>
      <Topbar variant="app" active="/dashboard" />
      <main className="wrap">
        <div className="page-head">
          <div className="page-head-text">
            <Link href="/dashboard" className="link back-link">← Jobs</Link>
            <h1 className="title">{job.name} <StatusBadge status={detail.status} pill /></h1>
            <p className="caption">
              <span className="mono">{scheduleText}</span> · {job.timezone} · grace {job.grace_seconds}s · max runtime {job.max_runtime_seconds}s
            </p>
          </div>
        </div>
        <AppBanners
          project={project}
          projectId={project.id}
          lastCheckAt={meta?.last_check_at ?? null}
          unsentCount={unsent}
          showNotConfigured={false}
        />

        <div className="stat-strip" style={{ marginBottom: 16 }}>
          <div className="stat">
            <span className="stat-label">Status</span>
            <span className="stat-value"><StatusBadge status={detail.status} pill /></span>
          </div>
          <div className="stat">
            <span className="stat-label">Success rate</span>
            <span className="stat-value">{stats.success_rate_30d == null ? <span className="dash">—</span> : `${Math.round(stats.success_rate_30d * 100)}%`}</span>
            <span className="stat-window">last 30d</span>
          </div>
          <div className="stat">
            <span className="stat-label">p95 duration</span>
            <span className="stat-value mono">{stats.p95_duration_ms_30d == null ? <span className="dash">—</span> : fmtDuration(stats.p95_duration_ms_30d)}</span>
            <span className="stat-window">last 30d</span>
          </div>
          <div className="stat">
            <span className="stat-label">Executions</span>
            <span className="stat-value mono">{stats.executions_30d}</span>
            <span className="stat-window">last 30d</span>
          </div>
          <div className="stat">
            <span className="stat-label">Alerts</span>
            <span className="stat-value mono">{stats.open_alerts}</span>
            <span className="stat-window">unresolved</span>
          </div>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-header"><span className="card-title">Run history</span></div>
            <RunHistory initialRuns={runsData.runs} total={runsData.total} jobId={job.id} />
          </section>

          <section className="card">
            <div className="card-header"><span className="card-title">Alert history</span></div>
            {runsData.alerts.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No alerts yet for this job.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Time</th><th>Kind</th><th>Message</th><th>Delivery</th></tr>
                  </thead>
                  <tbody>
                    {runsData.alerts.map((a) => (
                      <tr key={a.id}>
                        <td className="num">{fmtClock(a.created_at)}</td>
                        <td>{KIND_LABELS[a.kind] ?? a.kind}</td>
                        <td className="mono">{a.message ? a.message.split("\n")[0].slice(0, 80) : <span className="dash">—</span>}</td>
                        <td>{deliveryOf(a)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-header"><span className="card-title">Duration</span></div>
            <DurationChart runs={chartRuns} />
          </section>

          <section className="card">
            <div className="card-header"><span className="card-title">Schedule settings</span></div>
            <ScheduleForm job={job} />
          </section>

          <section className="card">
            <div className="card-header"><span className="card-title">Danger zone</span></div>
            <p className="muted">Job names cannot change in v1. The SDK matches jobs by name.</p>
            <DeleteJobButton jobId={job.id} jobName={job.name} />
          </section>
        </div>
      </main>
    </>
  );
}
