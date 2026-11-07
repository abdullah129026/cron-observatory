// Dashboard (/dashboard). Signed-in only; signed-out requests
// redirect to /login, and accounts with no project redirect to
// /onboarding. Answers: which of my jobs need me right now.
import { redirect } from "next/navigation";
import Link from "next/link";
import Topbar from "../../components/Topbar.js";
import AppBanners from "../../components/AppBanners.js";
import JobTable from "./JobTable.js";
import QueryToast from "../../components/QueryToast.js";
import { getSessionUser } from "@/lib/auth.js";
import { createStore } from "@/lib/store.js";
import { isConfigured } from "@/lib/db.js";
import { resolveSelectedProject } from "@/lib/selected.js";
import { listJobRows } from "@/lib/dashboard.js";

export const dynamic = "force-dynamic";

function ServiceDown() {
  return (
    <>
      <Topbar variant="app" active="/dashboard" />
      <main className="wrap">
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title">Jobs</h1>
          </div>
        </div>
        <div className="banner-stack">
          <div className="banner banner-danger" role="alert">
            <span className="banner-body">
              <span className="banner-title">Could not reach the service.</span>
            </span>
            <Link href="/dashboard" className="btn btn-secondary btn-sm">Retry</Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isConfigured()) return <ServiceDown />;

  const store = createStore();
  let selected;
  try {
    const resolved = await resolveSelectedProject(store, user.id);
    selected = resolved.selected;
  } catch {
    return <ServiceDown />;
  }
  if (!selected) redirect("/onboarding");

  let jobs = null;
  let meta = null;
  let unsent = 0;
  try {
    jobs = await listJobRows(store, selected.id, new Date());
    meta = await store.getMeta();
    unsent = await store.countUnsentAlerts(selected.id);
  } catch {
    jobs = null;
  }

  const attention = jobs ? jobs.filter((j) => j.status === "down" || j.status === "timed_out" || j.status === "late").length : 0;

  return (
    <>
      <Topbar variant="app" active="/dashboard" />
      <main className="wrap">
        <QueryToast />
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title">Jobs</h1>
            <p className="caption">
              {jobs === null ? selected.name : `${jobs.length} job${jobs.length === 1 ? "" : "s"}, ${attention} need${attention === 1 ? "s" : ""} attention`}
            </p>
          </div>
        </div>
        <AppBanners
          project={selected}
          projectId={selected.id}
          lastCheckAt={meta?.last_check_at ?? null}
          unsentCount={unsent}
          showNotConfigured
        />
        {jobs === null ? (
          <div className="banner-stack">
            <div className="banner banner-danger" role="alert">
              <span className="banner-body">
                <span className="banner-title">Could not load jobs.</span>
              </span>
              <Link href="/dashboard" className="btn btn-secondary btn-sm">Retry</Link>
            </div>
          </div>
        ) : (
          <JobTable initialJobs={jobs} projectId={selected.id} projectName={selected.name} />
        )}
      </main>
    </>
  );
}
