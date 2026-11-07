// Code block with a header and a Copy button. Children is the raw
// code text; pass pre-highlighted nodes via `nodes` when the snippet
// needs token colors.
import CopyButton from "./CopyButton.js";

export function trackCopy(eventName) {
  if (!eventName) return;
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: eventName }),
  }).catch(() => { /* analytics never blocks the copy */ });
}

export default function CodeBlock({ label, code, nodes, track }) {
  return (
    <div className="code">
      <div className="code-header">
        <span>{label}</span>
        <CopyButton text={code} onCopied={() => trackCopy(track)} />
      </div>
      <pre>{nodes ?? code}</pre>
    </div>
  );
}
