// Landing (/). Public. Answers: what is this, and why trust it with
// your 3am jobs. Same tokens as the app, no separate marketing skin.
// The demo strips render from real demo data only (docs 1): hollow
// ticks with an honest caption until the seed exists.
export const dynamic = "force-dynamic";
import Link from "next/link";
import Topbar from "../components/Topbar.js";
import RadarMark from "../components/RadarMark.js";
import CodeBlock from "../components/CodeBlock.js";
import TickStrip, { HollowStrip } from "../components/TickStrip.js";
import StatusBadge from "../components/StatusBadge.js";
import QueryToast from "../components/QueryToast.js";
import { createStore } from "@/lib/store.js";
import { isConfigured } from "@/lib/db.js";
import { failureMessage } from "@/lib/slack.js";
import { event } from "@/lib/log.js";
import { fmtClock } from "@/lib/format.js";

const WRAP_SNIPPET = `import { wrap } from "cron-observatory-sdk";

await wrap("nightly-backup", runBackup);`;

const WRAP_SCHEDULE = `await wrap("nightly-backup", {
  schedule: "0 3 * * *",
  timezone: "Asia/Karachi",
}, runBackup);`;

async function loadDemo() {
  if (!isConfigured()) return { demo: null, failed: false };
  try {
    const store = createStore();
    const demo = await store.getDemoStrip();
    return { demo, failed: false };
  } catch {
    return { demo: null, failed: true };
  }
}

export default async function Home() {
  event("landing_viewed");
  const { demo, failed } = await loadDemo();

  const heroStrip = demo ? (
    <>
      <TickStrip strip={demo.strip} />
      <p className="caption">30 days of {demo.jobName} on the demo project</p>
    </>
  ) : failed ? (
    <>
      <HollowStrip />
      <p className="caption">Demo strip unavailable</p>
    </>
  ) : (
    <>
      <HollowStrip />
      <p className="caption">Waiting for the demo job&rsquo;s first runs</p>
    </>
  );

  const slackText = demo?.failure
    ? failureMessage(demo.jobName, "demo", fmtClock(demo.failure.started_at), demo.failure.log_excerpt, "")
    : null;

  return (
    <>
      <Topbar variant="landing" />
      <QueryToast />
      <main className="wrap">
        <section className="hero">
          <h1 className="display">Know the minute a cron job fails.</h1>
          <p className="lede">
            A tiny wrapper around your jobs. When one fails, misses its run, or runs too long,
            you get one Slack message, with the log attached. No more finding out from customers.
          </p>
          <CodeBlock label="wrap a job" code={WRAP_SNIPPET} track="sdk_snippet_copied" />
          <div className="cta-row">
            <Link href="/login" className="btn">Get your API key</Link>
            <Link href="/docs" className="link">Read the docs</Link>
          </div>
          <div className="proof">{heroStrip}</div>
        </section>

        <section className="section">
          <h2 className="section-title section-head">How it works</h2>
          <div className="step-row">
            <span className="step-num">01</span>
            <div className="step-body">
              <h3 className="section-title">Add the SDK</h3>
              <p>Copy one file into your repo, or install the package. It has no dependencies. Set <span className="code-inline">CRON_API_KEY</span> once.</p>
            </div>
          </div>
          <div className="step-row">
            <span className="step-num">02</span>
            <div className="step-body">
              <h3 className="section-title">Wrap the job</h3>
              <p>One call around the function. The schedule rides along, so the monitor knows when the next run is due.</p>
              <CodeBlock label="wrap with a schedule" code={WRAP_SCHEDULE} track="sdk_snippet_copied" />
            </div>
          </div>
          <div className="step-row">
            <span className="step-num">03</span>
            <div className="step-body">
              <h3 className="section-title">Get the Slack alert</h3>
              <p>On failure, one message lands in your channel: the job name, when it started, the first log lines, and a link to the run.</p>
              <pre className="log">:red_circle: Cron job failed: <span className="log-err">nightly-backup</span> (demo){"\n"}Started: Nov 2, 2026 03:00{"\n"}Log: Error: backup upload failed: ECONNRESET</pre>
              <p className="caption">Example message shape, not a real alert.</p>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title section-head">Why this exists</h2>
          <div className="step-row">
            <span className="step-num">01</span>
            <div className="step-body">
              <h3 className="section-title">Silent failures</h3>
              <p>A backup fails at 3am. It fails again the next night, and the next. Nobody knows until a customer asks where their data went, a week later.</p>
            </div>
          </div>
          <div className="step-row">
            <span className="step-num">02</span>
            <div className="step-body">
              <h3 className="section-title">Failed logs, attached</h3>
              <p>The alert carries the log excerpt, so the cause is in the message. No SSH-ing at dawn to find what broke.</p>
            </div>
          </div>
          <div className="step-row">
            <span className="step-num">03</span>
            <div className="step-body">
              <h3 className="section-title">Missed versus slow</h3>
              <p>Late means the run is overdue but inside its grace window, and it never pages. Down means the window passed with no ping. <StatusBadge status="late" pill /> and <StatusBadge status="down" pill /> detect different things, and the dashboard says which.</p>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title section-head">Live demo</h2>
          {demo ? (
            <div className="stack">
              <TickStrip strip={demo.strip} />
              <p className="caption">30 days of {demo.jobName} on the demo project</p>
              {demo.failure?.log_excerpt && (
                <pre className="log">{demo.failure.log_excerpt}</pre>
              )}
              {slackText && <pre className="log">{slackText}</pre>}
              <p className="caption">Demo data from the seeded demo project.</p>
            </div>
          ) : (
            <div className="stack">
              <HollowStrip />
              <p className="caption">{failed ? "Demo strip unavailable" : "Waiting for the demo job\u2019s first runs"}</p>
            </div>
          )}
        </section>

        <section className="section">
          <div className="card">
            <div className="card-title">Free in v1. No card.</div>
            <p className="muted">Ten jobs per account, one Slack webhook, MIT-licensed SDK. <Link href="/docs" className="link">Read the docs</Link> for the limits.</p>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title section-head">Questions</h2>
          <div className="faq-item">
            <h3 className="section-title">Who monitors the monitor?</h3>
            <p>An external uptime check hits the health endpoint every minute. If the check loop itself goes quiet for five minutes, the dashboard says so in plain text.</p>
          </div>
          <div className="faq-item">
            <h3 className="section-title">Is this just a dead man&rsquo;s switch?</h3>
            <p>That is the core, yes. The wrapper adds what a switch cannot: it captures what the job did, so a failure arrives with its log instead of only a silence.</p>
          </div>
          <div className="faq-item">
            <h3 className="section-title">What about alert fatigue?</h3>
            <p>One message per incident until recovery. A Late job never pages, and a recovery sends exactly one follow-up.</p>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title section-head">Wrap your first job tonight.</h2>
          <Link href="/docs" className="btn">Read the docs</Link>
        </section>
      </main>
      <footer className="footer">
        <span className="brand"><RadarMark size={16} />Cron Job Observatory</span>
        <nav>
          <Link href="/docs">Docs</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://github.com/abdullah129026/cron-observatory">GitHub</a>
        </nav>
        <span>Free in v1, no card.</span>
      </footer>
    </>
  );
}
