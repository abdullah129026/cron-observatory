// Settings (/settings). Signed-in only. Answers: keys, webhook,
// account. One page, stacked cards, no tabs in v1. The topbar
// project switcher is the project context for the whole page.
import { redirect } from "next/navigation";
import Link from "next/link";
import Topbar from "../../components/Topbar.js";
import AppBanners from "../../components/AppBanners.js";
import QueryToast from "../../components/QueryToast.js";
import ProjectsCard from "./ProjectsCard.js";
import KeysCard from "./KeysCard.js";
import WebhookCard from "./WebhookCard.js";
import ExportCard from "./ExportCard.js";
import DangerZoneCard from "./DangerZoneCard.js";
import { getSessionUser } from "@/lib/auth.js";
import { createStore } from "@/lib/store.js";
import { isConfigured } from "@/lib/db.js";
import { resolveSelectedProject } from "@/lib/selected.js";
import { relTime } from "@/lib/format.js";

export const dynamic = "force-dynamic";

function ServiceDown() {
  return (
    <>
      <Topbar variant="app" active="/settings" />
      <main className="wrap">
        <div className="banner-stack" style={{ marginTop: 32 }}>
          <div className="banner banner-danger" role="alert">
            <span className="banner-body"><span className="banner-title">Could not reach the service.</span></span>
            <Link href="/settings" className="btn btn-secondary btn-sm">Retry</Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isConfigured()) return <ServiceDown />;

  const store = createStore();
  let projects;
  let selected;
  try {
    const resolved = await resolveSelectedProject(store, user.id);
    projects = resolved.projects;
    selected = resolved.selected;
  } catch {
    return <ServiceDown />;
  }

  let meta = null;
  let unsent = 0;
  let keys = [];
  let last4 = null;
  let projectsWithCounts = [];
  try {
    meta = await store.getMeta();
    projectsWithCounts = await Promise.all(projects.map(async (p) => {
      const jobs = await store.listJobsByProject(p.id);
      return { id: p.id, name: p.name, created_at: p.created_at, jobCount: jobs.length };
    }));
    if (selected) {
      unsent = await store.countUnsentAlerts(selected.id);
      keys = await store.listKeysByProject(selected.id);
      if (selected.slack_webhook_enc) {
        const url = await store.getProjectWebhook(selected.id);
        if (url) last4 = url.slice(-4);
      }
    }
  } catch {
    return <ServiceDown />;
  }

  return (
    <>
      <Topbar variant="app" active="/settings" />
      <main className="wrap">
        <QueryToast />
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title">Settings</h1>
            <p className="caption">Keys, webhook, account.</p>
          </div>
        </div>
        {selected && (
          <AppBanners
            project={selected}
            projectId={selected.id}
            lastCheckAt={meta?.last_check_at ?? null}
            unsentCount={unsent}
            showNotConfigured={false}
          />
        )}
        <div className="stack">
          <ProjectsCard projects={projectsWithCounts} selectedId={selected?.id ?? null} />
          {selected ? (
            <>
              <KeysCard projectId={selected.id} projectName={selected.name} initialKeys={keys} />
              <WebhookCard
                projectId={selected.id}
                projectName={selected.name}
                configured={Boolean(selected.slack_webhook_enc)}
                last4={last4}
                consecutiveFailures={selected.slack_consecutive_failures ?? 0}
                unsentCount={unsent}
              />
              <section className="card">
                <div className="card-header"><span className="card-title">Monitor status</span></div>
                <p className="caption">The monitor runs on free tiers; the check loop is the pg_cron tick.</p>
                <div className="kv-row">
                  <span className="kv-key">Last check ran</span>
                  <span className="kv-val">{meta?.last_check_at ? relTime(meta.last_check_at) : <span className="dash">—</span>}</span>
                </div>
                <div className="kv-row">
                  <span className="kv-key">Check cadence</span>
                  <span className="kv-val">every 60s</span>
                </div>
                <div className="kv-row">
                  <span className="kv-key">Health endpoint</span>
                  <span className="kv-val"><Link href="/api/health" className="link mono">/api/health</Link></span>
                </div>
              </section>
              <ExportCard projectId={selected.id} />
              <DangerZoneCard />
            </>
          ) : (
            <section className="card">
              <div className="card-header"><span className="card-title">Keys, webhook, and account</span></div>
              <p className="muted">Create a project first. Keys, the Slack webhook, export, and account settings need a project to attach to.</p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
