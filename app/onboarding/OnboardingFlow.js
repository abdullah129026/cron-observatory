"use client";

// Onboarding: one route, three steps. Step 1 creates the project,
// step 2 shows the API key once, step 3 is the pre-filled snippet.
// From Settings ("Setup snippet") the flow opens at step 3 for the
// selected project, where SnippetCard creates a key if needed.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import KeyModal from "@/components/KeyModal.js";
import SnippetCard from "@/components/SnippetCard.js";

export default function OnboardingFlow({ initialStep, project }) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdProject, setCreatedProject] = useState(project ?? null);
  const [rawKey, setRawKey] = useState(null);

  async function createProject() {
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
      setCreatedProject(data.project);
      await createKey(data.project.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function createKey(pid) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${pid}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "default" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not create the API key.");
      setRawKey(data.key.raw);
      setStep(2);
    } catch (e) {
      // The project exists; the key did not. Stay on step 1 with a
      // banner and let the user retry the key creation.
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {step === 3 && createdProject ? (
        <div className="form-stack">
          <h1 className="title">Wire up your first job</h1>
          <SnippetCard projectId={createdProject.id} projectName={createdProject.name} initialKey={rawKey} />
          <div>
            <Link href="/docs" className="link">Read the docs</Link>
          </div>
          <div>
            <button type="button" className="btn" onClick={() => router.push("/dashboard")}>Go to dashboard</button>
          </div>
        </div>
      ) : (
        <div className="form-stack">
          <h1 className="title">Create your first project</h1>
          <p className="muted">One project per app or service. You can create more later.</p>
          {error && (
            <div className="banner banner-danger" role="alert">
              <span className="banner-body"><span className="banner-title">{error}</span></span>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="project-name">Project name</label>
            <input
              id="project-name"
              className="input"
              type="text"
              placeholder="my-app"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={fieldError ? "true" : "false"}
            />
            {fieldError && <span className="field-error">{fieldError}</span>}
            <span className="field-hint">Names are not unique; creating the same name twice is allowed.</span>
          </div>
          {createdProject ? (
            <button type="button" className={`btn${busy ? " is-loading" : ""}`} disabled={busy} onClick={() => createKey(createdProject.id)}>
              Create API key
            </button>
          ) : (
            <button type="button" className={`btn${busy ? " is-loading" : ""}`} disabled={busy} onClick={createProject}>
              Create project
            </button>
          )}
        </div>
      )}
      {step === 2 && rawKey && (
        <KeyModal rawKey={rawKey} onDone={() => setStep(3)} />
      )}
    </>
  );
}
