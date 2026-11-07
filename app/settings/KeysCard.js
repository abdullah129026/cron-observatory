"use client";

// API keys card: create form plus a table of key metadata. Key rows
// never show values, only names and metadata. Creating a key opens
// the show-once modal; revoking asks first.
import { useState } from "react";
import Modal from "@/components/Modal.js";
import KeyModal from "@/components/KeyModal.js";
import { showToast } from "@/components/Toasts.js";
import { relTime, fmtDate } from "@/lib/format.js";

export default function KeysCard({ projectId, projectName, initialKeys }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rawKey, setRawKey] = useState(null);
  const [revoking, setRevoking] = useState(null);

  async function create() {
    if (!name.trim()) {
      setFieldError("Give the key a name.");
      return;
    }
    setFieldError("");
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not create the key.");
      setName("");
      setKeys((prev) => [{ id: data.key.id, name: data.key.name, created_at: data.key.created_at, last_used_at: null, revoked_at: null }, ...prev]);
      setRawKey(data.key.raw);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(key) {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/keys/${key.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not revoke the key.");
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
      setRevoking(null);
      showToast("success", "Key revoked.");
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setBusy(false);
    }
  }

  const live = keys.filter((k) => !k.revoked_at);

  return (
    <section className="card">
      <div className="card-header"><span className="card-title">API keys for {projectName}</span></div>
      <p className="caption">Last used is tracked at hourly granularity.</p>
      {error && (
        <div className="banner banner-danger" role="alert" style={{ marginBottom: 12 }}>
          <span className="banner-body"><span className="banner-title">{error}</span></span>
        </div>
      )}
      <div className="form-stack" style={{ marginBottom: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="new-key-name">New key</label>
          <input
            id="new-key-name"
            className="input"
            type="text"
            placeholder="prod"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={fieldError ? "true" : "false"}
          />
          {fieldError && <span className="field-error">{fieldError}</span>}
        </div>
        <div>
          <button type="button" className={`btn${busy ? " is-loading" : ""}`} disabled={busy} onClick={create}>Create key</button>
        </div>
      </div>
      {live.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No keys yet.</div>
          <p className="empty-body">Create a key above to start sending pings.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Created</th><th>Last used</th><th></th></tr>
            </thead>
            <tbody>
              {live.map((k) => (
                <tr key={k.id}>
                  <td className="job-name">{k.name}</td>
                  <td className="num">{fmtDate(k.created_at)}</td>
                  <td className="num">{k.last_used_at ? relTime(k.last_used_at) : <span className="dash">—</span>}</td>
                  <td><button type="button" className="btn-danger" onClick={() => setRevoking(k)}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rawKey && <KeyModal rawKey={rawKey} onDone={() => setRawKey(null)} />}
      {revoking && (
        <Modal
          title={`Revoke ${revoking.name}?`}
          onClose={() => setRevoking(null)}
          actions={
            <>
              <button type="button" className="btn-secondary" onClick={() => setRevoking(null)}>Cancel</button>
              <button type="button" className={`btn-danger${busy ? " is-loading" : ""}`} disabled={busy} onClick={() => revoke(revoking)}>Revoke key</button>
            </>
          }
        >
          <p>This takes effect immediately and cannot be undone. Jobs using this key start failing authentication, and those jobs go Late, then Down, like any quiet job. Create a new key if the job should keep reporting.</p>
        </Modal>
      )}
    </section>
  );
}
