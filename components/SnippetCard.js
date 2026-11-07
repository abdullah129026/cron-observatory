"use client";

// Pre-filled setup snippet for one project: the wrap() call with
// the project's real key already inside it. When no key exists yet
// (Settings entry), one button creates it and the snippet fills in.
// The raw key lives only in this component's state, never in a URL.
import { useState } from "react";
import CodeBlock from "./CodeBlock.js";

export function snippetFor(key) {
  return `import { wrap, configure } from "cron-observatory-sdk";

configure({ apiKey: "${key}" });

await wrap("nightly-backup", {
  schedule: "0 3 * * *",
  timezone: "Asia/Karachi",
}, runBackup);`;
}

export default function SnippetCard({ projectId, projectName, initialKey }) {
  const [key, setKey] = useState(initialKey ?? null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function createKey() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "default" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not create the API key.");
      setKey(data.key.raw);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  if (!key) {
    return (
      <div className="form-stack">
        <p className="muted">Create an API key for <strong>{projectName}</strong> to get your setup snippet.</p>
        {error && (
          <div className="banner banner-danger" role="alert">
            <span className="banner-body"><span className="banner-title">{error}</span></span>
          </div>
        )}
        <div>
          <button type="button" className={`btn${creating ? " is-loading" : ""}`} disabled={creating} onClick={createKey}>
            Create API key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-stack">
      <CodeBlock label={`setup snippet for ${projectName}`} code={snippetFor(key)} track="sdk_snippet_copied" />
      <p className="muted">Paste this into your job, run it once, and the dashboard fills in.</p>
    </div>
  );
}
