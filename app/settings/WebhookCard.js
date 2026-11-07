"use client";

// Slack webhook card: one masked field, Save, Test, health line, and
// Remove. After a save the field shows only the last four characters
// of the stored URL; the URL itself never leaves the server.
import { useState } from "react";
import Modal from "@/components/Modal.js";
import { showToast } from "@/components/Toasts.js";

export default function WebhookCard({ projectId, projectName, configured, last4, consecutiveFailures, unsentCount }) {
  const [url, setUrl] = useState("");
  const [show, setShow] = useState(false);
  const [savedLast4, setSavedLast4] = useState(last4);
  const [hasWebhook, setHasWebhook] = useState(configured);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [unhealthy, setUnhealthy] = useState((consecutiveFailures ?? 0) >= 3);

  async function save() {
    if (!url.trim()) {
      setError("Paste the Slack webhook URL.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not save the webhook.");
      setSavedLast4(url.trim().slice(-4));
      setHasWebhook(true);
      setUrl("");
      showToast("success", "Webhook saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setError("");
    setTesting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhook/test`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Test message failed.");
      setUnhealthy(false);
      showToast("success", "Test message sent. Check the channel.");
    } catch (e) {
      setError(e.message);
    } finally {
      setTesting(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhook`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not remove the webhook.");
      setHasWebhook(false);
      setSavedLast4(null);
      setRemoving(false);
      showToast("success", "Webhook removed.");
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-header"><span className="card-title">Slack webhook for {projectName}</span></div>
      <div className="form-stack">
        <div className="field">
          <label className="field-label" htmlFor="webhook-url">Webhook URL</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              id="webhook-url"
              className="input mono"
              type={show ? "text" : "password"}
              placeholder="https://hooks.slack.com/services/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-invalid={error ? "true" : "false"}
            />
            <button type="button" className="btn-text" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
          </div>
          {error && <span className="field-error">{error}</span>}
          {hasWebhook && <span className="field-hint">Saved{ savedLast4 ? `, ending ${savedLast4}` : ""}. Editing replaces the whole value.</span>}
          {!hasWebhook && <span className="field-hint">No webhook saved for this project.</span>}
        </div>
        <div className="row-actions">
          <button type="button" className={`btn${busy ? " is-loading" : ""}`} disabled={busy} onClick={save}>Save webhook</button>
          <button type="button" className={`btn btn-secondary${testing ? " is-loading" : ""}`} disabled={testing || !hasWebhook} onClick={test}>Send test message</button>
          {hasWebhook && <button type="button" className="btn-danger" onClick={() => setRemoving(true)}>Remove webhook</button>}
        </div>
        <div className="kv-row">
          <span className="kv-key">Health</span>
          <span className="kv-val">
            <span className="status-pill" data-state={unhealthy ? "down" : "up"}>{unhealthy ? "Unhealthy" : "Healthy"}</span>
            {unsentCount > 0 && <span className="muted"> · {unsentCount} alert{unsentCount === 1 ? "" : "s"} queued, retrying</span>}
          </span>
        </div>
      </div>
      {removing && (
        <Modal
          title="Remove the Slack webhook?"
          onClose={() => setRemoving(false)}
          actions={
            <>
              <button type="button" className="btn-secondary" onClick={() => setRemoving(false)}>Cancel</button>
              <button type="button" className={`btn-danger${busy ? " is-loading" : ""}`} disabled={busy} onClick={remove}>Remove webhook</button>
            </>
          }
        >
          <p>Alerts stop for this project, and the dashboard warning returns. Queued unsent alerts are dropped. The removal is immediate.</p>
        </Modal>
      )}
    </section>
  );
}
