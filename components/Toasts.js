"use client";

// Toast stack, bottom-right. Any component fires a toast with
// showToast(kind, message, actionHref); the stack owns display and
// dismissal. Toasts never carry secrets, keys, or webhook URLs.
import { useEffect, useState } from "react";

let nextId = 1;

export function showToast(kind, message, action) {
  window.dispatchEvent(new CustomEvent("co:toast", { detail: { kind, message, action } }));
}

const ICONS = {
  success: (<><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>),
  error: (<path d="M5.2 2.8h5.6l2.4 2.4v5.6l-2.4 2.4H5.2l-2.4-2.4V5.2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />),
  info: (<><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 7.2V11M8 5v.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>),
};

export default function ToastStack() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const id = nextId++;
      const t = { id, ...e.detail };
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000);
    }
    window.addEventListener("co:toast", onToast);
    return () => window.removeEventListener("co:toast", onToast);
  }, []);

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">{ICONS[t.kind] ?? ICONS.info}</svg>
          <span>{t.message}</span>
          {t.action && (
            <a className="toast-action link" href={t.action.href}>{t.action.label}</a>
          )}
          <button type="button" className="btn-text btn-sm" aria-label="Dismiss" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}>✕</button>
        </div>
      ))}
    </div>
  );
}
