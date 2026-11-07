"use client";

// "Retry sends" action for the unsent-alerts banner. Fires an
// immediate retry; failure keeps the banner and shows an error toast.
import { useState } from "react";
import { showToast } from "./Toasts.js";

export default function RetrySendsButton({ projectId }) {
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/alerts/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Retry failed.");
      if (data.sent > 0) showToast("success", `${data.sent} alert${data.sent === 1 ? "" : "s"} sent.`);
      else showToast("error", "Nothing sent yet. The alerts are still queued.");
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={`btn btn-secondary btn-sm${busy ? " is-loading" : ""}`} disabled={busy} onClick={retry}>
      Retry sends
    </button>
  );
}
