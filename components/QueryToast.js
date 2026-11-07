"use client";

// One-shot toast from a query param (for example after a delete
// redirects back to the dashboard with ?toast=job_deleted). Reads
// the param once on mount, fires the toast, then drops the param
// from the URL so a refresh does not repeat it.
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { showToast } from "./Toasts.js";

const MESSAGES = {
  job_deleted: ["success", "Job deleted."],
  project_deleted: ["success", "Project deleted."],
  account_deleted: ["info", "Your account and data are deleted."],
};

function QueryToastInner() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const key = params.get("toast");
    if (!key || !MESSAGES[key]) return;
    const [kind, message] = MESSAGES[key];
    showToast(kind, message);
    const next = new URLSearchParams(params.toString());
    next.delete("toast");
    const qs = next.toString();
    router.replace(window.location.pathname + (qs ? `?${qs}` : ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function QueryToast() {
  return (
    <Suspense fallback={null}>
      <QueryToastInner />
    </Suspense>
  );
}
