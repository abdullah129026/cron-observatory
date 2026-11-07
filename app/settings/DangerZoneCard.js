"use client";

// Account delete: two steps. Step 1 names the cascade and deletes
// nothing; step 2 needs the word DELETE typed exactly. Success signs
// the user out and goes home with a one-time info banner.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal.js";
import { browserClient } from "@/lib/supabase-browser.js";

export default function DangerZoneCard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setStep(0);
    setTyped("");
    setError("");
  }

  async function remove() {
    if (typed !== "DELETE") return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not delete the account.");
      const client = browserClient();
      if (client) await client.auth.signOut();
      router.push("/?toast=account_deleted");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-header"><span className="card-title">Danger zone</span></div>
      <p className="muted">Every project, job, run, alert, key, and webhook on this account is deleted. Exports stop working after deletion, so export first if you need the data.</p>
      <div>
        <button type="button" className="btn-danger" onClick={() => setStep(1)}>Delete account</button>
      </div>
      {step === 1 && (
        <Modal
          title="Delete your account?"
          onClose={close}
          actions={
            <>
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              <button type="button" className="btn-secondary" onClick={() => setStep(2)}>Continue</button>
            </>
          }
        >
          <p>Every project, job, run, alert, key, and webhook on this account is deleted. Exports stop working after deletion, so export first if you need the data.</p>
        </Modal>
      )}
      {step === 2 && (
        <Modal
          title="Type DELETE to confirm."
          onClose={close}
          actions={
            <>
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              <button type="button" className={`btn-danger${busy ? " is-loading" : ""}`} disabled={busy || typed !== "DELETE"} onClick={remove}>Delete my account</button>
            </>
          }
        >
          <p>Every project, job, run, alert, key, and webhook on this account is deleted. There is no recovery path.</p>
          <div className="field">
            <label className="field-label" htmlFor="delete-confirm">Type DELETE to confirm</label>
            <input id="delete-confirm" className="input mono" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
          {error && <p className="field-error">{error}</p>}
        </Modal>
      )}
    </section>
  );
}
