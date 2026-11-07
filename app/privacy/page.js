// Privacy Policy (/privacy). Public, landing chrome. Layout only:
// the content is generated then human-reviewed in phase-6, before
// launch. The sections already name the real data inventory and
// retention windows, because the phase-6 review checks those
// sections against the real behavior.
import Link from "next/link";
import Topbar from "../../components/Topbar.js";
import Footer from "../../components/Footer.js";

const DRAFT = "Draft. The full policy is being reviewed and will be published before launch.";

export default function PrivacyPage() {
  return (
    <>
      <Topbar variant="landing" />
      <main className="wrap-narrow docs">
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title">Privacy Policy</h1>
            <p className="caption">Last updated: not yet published.</p>
          </div>
        </div>
        <section className="section">
          <h2 className="section-title section-head">What we store</h2>
          <p>Projects, jobs, runs, alerts, API key metadata (never raw keys), and webhook presence (never the URL). {DRAFT}</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">How long we keep it</h2>
          <p>Success runs are kept 30 days. Failure and missed runs are kept 90 days. Deleted jobs, projects, and accounts follow the same retention windows. {DRAFT}</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">What we send elsewhere</h2>
          <p>Alert messages go to the Slack webhook you save, and nothing else leaves the service. {DRAFT}</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Your data, your call</h2>
          <p>You can export your data from Settings at any time, and delete your account from Settings. Deletion is immediate and has no recovery path. {DRAFT}</p>
        </section>
        <p><Link href="/" className="link">Back to home</Link></p>
      </main>
      <Footer />
    </>
  );
}
