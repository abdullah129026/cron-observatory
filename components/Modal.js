"use client";

// Confirm modal: one shape for every destructive action. Closes on
// Escape and on backdrop click, traps Tab inside, focuses the first
// button on open, returns focus to the trigger on close.
import { useEffect, useRef } from "react";

export default function Modal({ title, children, actions, onClose }) {
  const box = useRef(null);
  const trigger = useRef(typeof document !== "undefined" ? document.activeElement : null);

  useEffect(() => {
    const first = box.current?.querySelector("button");
    if (first) first.focus();
    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;
      const items = [...box.current.querySelectorAll("button, input, select, textarea, a[href]")]
        .filter((el) => !el.disabled);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (trigger.current?.focus) trigger.current.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={box}>
        <div className="modal-title">{title}</div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
