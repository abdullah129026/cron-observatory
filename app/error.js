"use client";

// Route failure screen. Never a stack trace, never a raw server message.
import Link from "next/link";

export default function Error({ error, reset }) {
  return (
    <main className="wrap">
      <div className="center-card">
        <div className="card">
          <div className="form-stack">
            <h1 className="title">Something went wrong.</h1>
            <p className="muted">Try again. If it keeps failing, the monitor status on the settings page shows whether the service itself is down.</p>
            <div className="row-actions">
              <button type="button" className="btn btn-secondary" onClick={() => reset()}>Retry</button>
              <Link href="/dashboard" className="link">Back to dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
