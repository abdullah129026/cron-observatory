"use client";

// Delete job: confirm modal first, then the soft delete. Success
// goes back to the dashboard with a toast.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal.js";
import { showToast } from "@/components/Toasts.js";

export default function DeleteJobButton({ jobId, jobName }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not delete the job.");
      router.push("/dashboard?toast=job_deleted");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>Delete this job</button>
      {open && (
        <Modal
          title={`Delete ${jobName}?`}
          onClose={() => setOpen(false)}
          actions={
            <>
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className={`btn-danger${busy ? " is-loading" : ""}`} disabled={busy} onClick={remove}>Delete job</button>
            </>
          }
        >
          <p>The job leaves the dashboard immediately. Its runs and alerts stay until the retention purge (success runs 30 days, failure and missed runs 90 days). Pings for this name are dropped until the purge clears it, then the name registers as a new job. There is no undelete screen in v1.</p>
          {error && <p className="field-error">{error}</p>}
        </Modal>
      )}
    </>
  );
}
