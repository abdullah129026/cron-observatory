"use client";

// Copy button: copies text, swaps its label to "Copied" for two
// seconds, then swaps back. No toast, so repeated copies stay quiet.
import { useRef, useState } from "react";

export default function CopyButton({ text, label = "Copy", onCopied, className = "btn-text btn-sm" }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API unavailable (old browser, no permission):
      // fall back to a selectable textarea so the copy still works.
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    if (onCopied) onCopied();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className={className} onClick={copy}>
      {copied ? "Copied" : label}
    </button>
  );
}
