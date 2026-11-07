// Settings loading state: skeleton rows inside the card frames.
import Topbar from "../../components/Topbar.js";

export default function Loading() {
  return (
    <>
      <Topbar variant="app" active="/settings" />
      <main className="wrap">
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title">Settings</h1>
            <p className="caption">Keys, webhook, account.</p>
          </div>
        </div>
        <div className="stack">
          {[0, 1, 2].map((i) => (
            <section key={i} className="card">
              <div className="skeleton" style={{ height: 20, width: 140, marginBottom: 12 }}>&nbsp;</div>
              <div className="skeleton" style={{ height: 16, marginBottom: 8 }}>&nbsp;</div>
              <div className="skeleton" style={{ height: 16, width: "70%" }}>&nbsp;</div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
