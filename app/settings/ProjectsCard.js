"use client";

// Projects card: inline create form plus one row per project with
// its job count, created date, a "Setup snippet" link, and Delete.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal.js";
import { showToast } from "@/components/Toasts.js";
import { fmtDate } from "@/lib/format.js";

export default function ProjectsCard({ projects, selectedId }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function create() {
    if (!name.trim()) {
      setFieldError("Give the project a name.");
      return;
    }
    setFieldError("");
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not create the project.");
      setName("");
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeProject(project) {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not delete the project.");
      setDeleting(null);
      const last = projects.length <= 1;
      router.push(last ? "/settings?toast=project_deleted" : "/dashboard?toast=project_deleted");
      router.refresh();
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-header"><span className="card-title">Projects</span></div>
      {error && (
        <div className="banner banner-danger" role="alert" style={{ marginBottom: 12 }}>
          <span className="banner-body"><span className="banner-title">{error}</span></span>
        </div>
      )}
      <div className="form-stack" style={{ marginBottom: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="new-project-name">New project</label>
          <input
            id="new-project-name"
            className="input"
            type="text"
            placeholder="my-app"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={fieldError ? "true" : "false"}
          />
          {fieldError && <span className="field-error">{fieldError}</span>}
        </div>
        <div>
          <button type="button" className={`btn${busy ? " is-loading" : ""}`} disabled={busy} onClick={create}>Create project</button>
        </div>
      </div>
      {projects.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No projects yet.</div>
          <p className="empty-body">Create your first project above.</p>
        </div>
      ) : (
        projects.map((p) => (
          <div key={p.id} className="kv-row">
            <span className="kv-key">{p.name}{p.id === selectedId ? " (selected)" : ""}</span>
            <span className="kv-val">{p.jobCount} job{p.jobCount === 1 ? "" : "s"} · created {fmtDate(p.created_at)}</span>
            <Link href={`/onboarding?project=${p.id}&step=3`} className="link">Setup snippet</Link>
            <button type="button" className="btn-danger" onClick={() => setDeleting(p)}>Delete</button>
          </div>
        ))
      )}
      {deleting && (
        <Modal
          title={`Delete ${deleting.name}?`}
          onClose={() => setDeleting(null)}
          actions={
            <>
              <button type="button" className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
              <button type="button" className={`btn-danger${busy ? " is-loading" : ""}`} disabled={busy} onClick={() => removeProject(deleting)}>Delete project</button>
            </>
          }
        >
          <p>The project, its jobs, its keys, and its webhook are deleted. Runs and alerts follow the same retention windows as a deleted job. The project leaves the switcher immediately. There is no undelete screen in v1.</p>
        </Modal>
      )}
    </section>
  );
}
