"use client";

// Data export: one JSON file with projects, jobs, key metadata (never
// raw keys), webhook presence (never the URL), runs, and alerts.
import { useState } from "react";
import { showToast } from "@/components/Toasts.js";

export default function ExportCard({ projectId }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export`);
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cron-observatory-export-${projectId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast("error", "Export failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-header"><span className="card-title">Data export</span></div>
      <p className="muted">One JSON file with projects, jobs, key metadata (never raw keys), webhook presence (never the URL), runs, and alerts.</p>
      <div>
        <button type="button" className={`btn btn-secondary${busy ? " is-loading" : ""}`} disabled={busy} onClick={download}>Export my data</button>
      </div>
    </section>
  );
}
