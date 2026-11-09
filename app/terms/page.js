// Terms of Service (/terms). Public, landing chrome. Content written
// in phase-6 against the real behavior; Abdullah human-reviews it
// before launch.
import Link from "next/link";
import Topbar from "../../components/Topbar.js";
import Footer from "../../components/Footer.js";

export default function TermsPage() {
  return (
    <>
      <Topbar variant="landing" />
      <main className="wrap-narrow docs">
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title">Terms of Service</h1>
            <p className="caption">Last updated: Nov 9, 2026.</p>
          </div>
        </div>
        <section className="section">
          <h2 className="section-title section-head">The service</h2>
          <p>Cron Job Observatory monitors cron jobs. You wrap a job with our SDK, it pings us on start and finish, and we tell you when a job fails or never runs. The service is free in v1, no card required, and the SDK is MIT-licensed. The service is provided as-is, with no warranty and no uptime promise. We run on free tiers, so we say so plainly instead of promising more.</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Your account</h2>
          <p>You sign in with a magic link sent to your email. You are responsible for your account and for the API keys you create. A key is shown once, at creation, and never again: treat it like a password, keep it out of public repos, and revoke it in Settings if it leaks. If someone uses your key, that use counts as yours until you revoke it.</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Acceptable use</h2>
          <p>Monitor jobs you own or operate. Do not use the service to probe, spam, or attack other systems, do not point alerts at webhooks you do not control, and do not try to break the rate limits (60 pings per minute per key, 10 jobs per account). We may suspend an account that abuses the service or breaks these rules.</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Availability and limits</h2>
          <p>The service runs on free tiers and is best effort. The database has no automatic backups on the free plan, and the project can pause after a week of inactivity, so keep your own export if the data matters to you. Limits may change as the service grows; if a limit changes, the docs page will say so. A missed alert is a bug, not a breach of contract: we never guarantee delivery of any single alert.</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Ending the service</h2>
          <p>You can delete your account in Settings at any time. Type DELETE to confirm. Deletion is immediate, it removes your projects, jobs, keys, and webhook, and it has no recovery path, so export first if you want the data. We can end or suspend the service for anyone who breaks these terms. If the service itself shuts down, we will say so on the landing page and keep export working until the shutdown date.</p>
        </section>
        <p><Link href="/" className="link">Back to home</Link></p>
      </main>
      <Footer />
    </>
  );
}
