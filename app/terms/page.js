// Terms of Service (/terms). Public, landing chrome. Layout only:
// the content is generated then human-reviewed in phase-6, before
// launch. This draft names the sections so the review has a shape
// to check against the real behavior.
import Link from "next/link";
import Topbar from "../../components/Topbar.js";
import Footer from "../../components/Footer.js";

const DRAFT = "Draft. The full terms are being reviewed and will be published before launch.";

export default function TermsPage() {
  return (
    <>
      <Topbar variant="landing" />
      <main className="wrap-narrow docs">
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title">Terms of Service</h1>
            <p className="caption">Last updated: not yet published.</p>
          </div>
        </div>
        <section className="section">
          <h2 className="section-title section-head">The service</h2>
          <p>{DRAFT}</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Your account</h2>
          <p>{DRAFT}</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Acceptable use</h2>
          <p>{DRAFT}</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Availability and limits</h2>
          <p>{DRAFT}</p>
        </section>
        <hr className="divider" />
        <section className="section">
          <h2 className="section-title section-head">Ending the service</h2>
          <p>{DRAFT}</p>
        </section>
        <p><Link href="/" className="link">Back to home</Link></p>
      </main>
      <Footer />
    </>
  );
}
