// Docs (/docs). Public. Answers: how do I wrap a job. Single
// column, sections separated by hairlines, body 16px. Code blocks
// use the placeholder key YOUR_API_KEY, never a real key.
import Link from "next/link";
import Topbar from "../../components/Topbar.js";
import CodeBlock from "../../components/CodeBlock.js";
import StatusBadge from "../../components/StatusBadge.js";
import { getSessionUser } from "@/lib/auth.js";
import { event } from "@/lib/log.js";

export const dynamic = "force-dynamic";

const INSTALL = `// v1: copy sdk/index.js from the repo into your project.
// The npm package is cron-observatory-sdk; publishing it is a
// manual step and is not promised here.
import { wrap, configure } from "cron-observatory-sdk";`;

const WRAP_BASIC = `await wrap("nightly-backup", runBackup);`;

const WRAP_SCHEDULE = `await wrap("nightly-backup", {
  schedule: "0 3 * * *",
  timezone: "Asia/Karachi",
}, runBackup);`;

const CONFIGURE = `// Set the key once, or set the CRON_API_KEY env var.
configure({ apiKey: "YOUR_API_KEY" });`;

export default async function DocsPage() {
  event("docs_viewed");
  const user = await getSessionUser();

  return (
    <>
      <Topbar variant={user ? "app" : "landing"} active="/docs" />
      <main className="wrap-narrow docs">
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title">Docs</h1>
            <p className="caption">Wrap a job, get one Slack message when it fails.</p>
          </div>
        </div>

        <section className="section">
          <h2 className="section-title section-head">Install</h2>
          <p>The SDK is one file with no dependencies. In v1 it is vendored under <span className="code-inline">/sdk</span> in the repo: copy <span className="code-inline">sdk/index.js</span> into your project and import it.</p>
          <CodeBlock label="import" code={INSTALL} track="sdk_snippet_copied" />
          <p>Set the key once with <span className="code-inline">configure()</span>, or set the <span className="code-inline">CRON_API_KEY</span> environment variable.</p>
          <CodeBlock label="configure" code={CONFIGURE} track="sdk_snippet_copied" />
        </section>

        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Wrap a job</h2>
          <p><span className="code-inline">wrap(name, fn)</span> runs your function and pings the service when it starts and when it finishes. The name is how the dashboard matches the job; keep it stable.</p>
          <CodeBlock label="wrap a job" code={WRAP_BASIC} track="sdk_snippet_copied" />
          <p>Pass the schedule along and the monitor knows when the next run is due, so it can tell a missed run from a job that simply has not run yet.</p>
          <CodeBlock label="wrap with a schedule" code={WRAP_SCHEDULE} track="sdk_snippet_copied" />
          <p>Three pings tie a run together: a start ping, a finish ping with success or the error text, and the run id that links them.</p>
        </section>

        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Options</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Option</th><th>Type</th><th>Default</th></tr>
              </thead>
              <tbody>
                <tr><td className="mono">schedule</td><td>Cron expression string</td><td className="mono">none</td></tr>
                <tr><td className="mono">timezone</td><td>IANA timezone string</td><td className="mono">UTC</td></tr>
              </tbody>
            </table>
          </div>
          <p>Grace and max runtime are not SDK options. They live in the job detail schedule settings, and you can change them without touching code.</p>
        </section>

        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Failure and logs</h2>
          <p>When the wrapped function throws, the SDK sends the error text plus a capped excerpt of the console output from the run. Bodies are capped at 32KB and excerpts are capped server-side, so a chatty job cannot flood the log.</p>
        </section>

        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Missed runs and timeouts</h2>
          <p><StatusBadge status="late" pill /> means the run is overdue but still inside its grace window. It never alerts. <StatusBadge status="down" pill /> means the window passed with no ping, and one missed alert fires.</p>
          <p>The grace rule is 10 percent of the period, clamped between 120 and 3600 seconds. A run that starts but never finishes is marked Timed-out once it passes its max runtime.</p>
          <p>Daylight saving is handled in the expected-run math: the repeated hour counts as one expected window, and the skipped hour has no occurrence. One missed ping never alerts on its own; the monitor waits for the window to close.</p>
        </section>

        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Limits</h2>
          <p>10 jobs per account. 60 pings per minute per key; beyond that the service answers 429, which the SDK treats as non-retryable and logs as a diagnostic.</p>
          <p>Pings must be awaited: <span className="code-inline">await wrap(...)</span>. Calling <span className="code-inline">process.exit()</span> inside a wrapped job is unsupported; in-flight pings die with the process. A lost finish ping degrades to Timed-out rather than silence.</p>
        </section>

        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Remove the SDK</h2>
          <p>Delete the <span className="code-inline">wrap()</span> calls, revoke the key in <Link href="/settings" className="link">Settings</Link>, and delete the job if it should not alert.</p>
          <p>One warning: an uninstalled but undeleted job goes Late, then Down, and fires one missed alert, because the monitor cannot tell uninstallation from an outage.</p>
        </section>
      </main>
    </>
  );
}
