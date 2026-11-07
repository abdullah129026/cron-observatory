// Page-level banners, in priority order, all persistent (each one
// names a condition that is still true). Exact copy from docs 9.
// Props come from the project row plus the monitor heartbeat.
import Link from "next/link";
import RetrySendsButton from "./RetrySendsButton.js";
import { relTime } from "@/lib/format.js";

const MONITOR_DOWN_AFTER_MS = 5 * 60 * 1000;

export function monitorDown(lastCheckAt, now = new Date()) {
  if (!lastCheckAt) return true;
  return now.getTime() - new Date(lastCheckAt).getTime() > MONITOR_DOWN_AFTER_MS;
}

export default function AppBanners({ project, projectId, lastCheckAt, unsentCount, showNotConfigured }) {
  const down = monitorDown(lastCheckAt);
  const unhealthy = (project?.slack_consecutive_failures ?? 0) >= 3;
  const configured = Boolean(project?.slack_webhook_enc);
  const testSucceeded = Boolean(project?.slack_test_succeeded_at);

  return (
    <div className="banner-stack">
      {down && (
        <div className="banner banner-danger" role="alert">
          <span className="banner-body">
            <span className="banner-title">The monitor has not checked in.</span>
            <span>Last check ran {lastCheckAt ? relTime(lastCheckAt) : "never"}. Alerts may be delayed until it resumes.</span>
          </span>
          <Link href="/settings" className="btn btn-secondary btn-sm">Open settings</Link>
        </div>
      )}
      {unhealthy && (
        <div className="banner banner-warning" role="alert">
          <span className="banner-body">
            <span className="banner-title">Slack alerts are unhealthy.</span>
            <span>{unsentCount} alerts are queued and Slack sends are failing.</span>
          </span>
          <Link href="/settings" className="btn btn-secondary btn-sm">Open settings</Link>
        </div>
      )}
      {!unhealthy && unsentCount > 0 && (
        <div className="banner banner-warning" role="alert">
          <span className="banner-body">
            <span className="banner-title">{unsentCount} alert{unsentCount === 1 ? "" : "s"} queued.</span>
            <span>Sends are being retried. They give up after 24 hours.</span>
          </span>
          <RetrySendsButton projectId={projectId} />
        </div>
      )}
      {showNotConfigured && (!configured || !testSucceeded) && (
        <div className="banner banner-info" role="status">
          <span className="banner-body">
            <span>Alerts are not configured yet. Save a Slack webhook and send a test message.</span>
          </span>
          <Link href="/settings" className="btn btn-secondary btn-sm">Open settings</Link>
        </div>
      )}
    </div>
  );
}
