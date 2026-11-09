// Privacy Policy (/privacy). Public, landing chrome. Content written
// in phase-6 against the real data inventory and retention windows;
// Abdullah human-reviews it before launch.
import Link from "next/link";
import Topbar from "../../components/Topbar.js";
import Footer from "../../components/Footer.js";

export default function PrivacyPage() {
  return (
    <>
      <Topbar variant="landing" />
      <main className="wrap-narrow docs">
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title">Privacy Policy</h1>
            <p className="caption">Last updated: Nov 9, 2026.</p>
          </div>
        </div>
        <section className="section">
          <h2 className="section-title section-head">What we store</h2>
          <p>Your email address, for magic-link sign-in. Your projects, jobs (names, schedules, timezones), runs (timestamps, status, duration, capped log excerpts, and error text from failed runs), and alerts. API keys are stored only as SHA-256 hashes; the raw key is shown once and never stored. Your Slack webhook URL is encrypted at rest and never shown back to you, only whether one is saved. We log server-side usage events (sign-in, project and key creation, first ping, alerts sent) to run the service. We use one cookie, the Supabase auth session cookie. There are no ads and no third-party trackers.</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">How long we keep it</h2>
          <p>Successful runs are kept 30 days. Failed, missed, and timed-out runs are kept 90 days. Resolved alerts are kept 90 days. Deleted jobs, projects, and keys are purged after 90 days. Account deletion in Settings soft-deletes your projects, jobs, and keys at once, clears the webhook, and deletes your auth user; the soft-deleted rows are purged after 90 days.</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">What we send elsewhere</h2>
          <p>Alert messages go to the Slack webhook you save, and only there. Magic-link emails go through the email provider configured for sign-in. Nothing is sold, and nothing is shared with advertisers or analytics vendors. Your data lives in one Supabase project and is not copied anywhere else.</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Your data, your call</h2>
          <p>You can export your data as JSON from Settings at any time. The export carries key metadata and webhook presence only, never a raw key or a webhook URL. You can delete your account from Settings. Deletion is immediate and has no recovery path. If you have a question about your data, open an issue on the project repo.</p>
        </section>
        <p><Link href="/" className="link">Back to home</Link></p>
      </main>
      <Footer />
    </>
  );
}
