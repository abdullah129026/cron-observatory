"use client";

// Schedule settings: the escape hatch for schedules set by wrap()
// options. Editing affects expected-run math from the save forward;
// past runs and alerts are untouched.
import { useState } from "react";
import { showToast } from "@/components/Toasts.js";

export default function ScheduleForm({ job }) {
  const [kind, setKind] = useState(job.schedule_kind ?? "none");
  const [cronExpr, setCronExpr] = useState(job.cron_expr ?? "");
  const [period, setPeriod] = useState(job.period_seconds ?? 300);
  const [timezone, setTimezone] = useState(job.timezone ?? "UTC");
  const [grace, setGrace] = useState(job.grace_seconds ?? 300);
  const [maxRuntime, setMaxRuntime] = useState(job.max_runtime_seconds ?? 3600);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setKind(job.schedule_kind ?? "none");
    setCronExpr(job.cron_expr ?? "");
    setPeriod(job.period_seconds ?? 300);
    setTimezone(job.timezone ?? "UTC");
    setGrace(job.grace_seconds ?? 300);
    setMaxRuntime(job.max_runtime_seconds ?? 3600);
    setErrors({});
    setFormError("");
  }

  async function save() {
    const nextErrors = {};
    if (kind === "cron" && !cronExpr.trim()) nextErrors.cron_expr = "Enter a cron expression. Example: 0 3 * * *.";
    if (kind === "interval" && (!Number.isInteger(Number(period)) || Number(period) < 60)) nextErrors.period_seconds = "Interval must be at least 60 seconds.";
    if (kind === "cron" && !timezone.trim()) nextErrors.timezone = "Enter an IANA timezone. Example: Asia/Karachi.";
    if (Number(grace) < 0) nextErrors.grace_seconds = "Grace must be 0 or more.";
    if (Number(maxRuntime) < 60) nextErrors.max_runtime_seconds = "Max runtime must be at least 60 seconds.";
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    const body = { grace_seconds: Number(grace), max_runtime_seconds: Number(maxRuntime) };
    if (kind === "none") body.schedule_kind = "none";
    if (kind === "cron") { body.schedule_kind = "cron"; body.cron_expr = cronExpr.trim(); body.timezone = timezone.trim(); }
    if (kind === "interval") { body.schedule_kind = "interval"; body.period_seconds = Number(period); }

    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message ?? "Could not save the schedule.";
        if (msg.includes("cron expression")) setErrors({ cron_expr: msg });
        else if (msg.includes("timezone")) setErrors({ timezone: msg });
        else if (msg.includes("Grace")) setErrors({ grace_seconds: msg });
        else setFormError(msg);
        return;
      }
      showToast("success", "Schedule saved.");
    } catch {
      setFormError("Could not save the schedule. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-stack">
      {formError && (
        <div className="banner banner-danger" role="alert">
          <span className="banner-body"><span className="banner-title">{formError}</span></span>
        </div>
      )}
      <div className="field">
        <label className="field-label" htmlFor="sched-kind">Schedule kind</label>
        <select id="sched-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="cron">Cron expression</option>
          <option value="interval">Interval</option>
          <option value="none">None</option>
        </select>
        {kind === "none" && <span className="field-hint">This job has no schedule, so it stays New and is excluded from the missed-run sweep.</span>}
      </div>
      {kind === "cron" && (
        <div className="field">
          <label className="field-label" htmlFor="sched-cron">Cron expression</label>
          <input id="sched-cron" className="input mono" value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} aria-invalid={errors.cron_expr ? "true" : "false"} />
          {errors.cron_expr && <span className="field-error">{errors.cron_expr}</span>}
        </div>
      )}
      {kind === "interval" && (
        <div className="field">
          <label className="field-label" htmlFor="sched-period">Interval (seconds)</label>
          <input id="sched-period" className="input" type="number" min="60" value={period} onChange={(e) => setPeriod(e.target.value)} aria-invalid={errors.period_seconds ? "true" : "false"} />
          {errors.period_seconds && <span className="field-error">{errors.period_seconds}</span>}
        </div>
      )}
      {kind !== "none" && (
        <div className="field">
          <label className="field-label" htmlFor="sched-tz">Timezone</label>
          <input id="sched-tz" className="input mono" value={timezone} onChange={(e) => setTimezone(e.target.value)} aria-invalid={errors.timezone ? "true" : "false"} />
          {errors.timezone && <span className="field-error">{errors.timezone}</span>}
          <span className="field-hint">IANA name, for example Asia/Karachi.</span>
        </div>
      )}
      <div className="field">
        <label className="field-label" htmlFor="sched-grace">Grace (seconds)</label>
        <input id="sched-grace" className="input" type="number" min="0" value={grace} onChange={(e) => setGrace(e.target.value)} aria-invalid={errors.grace_seconds ? "true" : "false"} />
        {errors.grace_seconds && <span className="field-error">{errors.grace_seconds}</span>}
        <span className="field-hint">Default rule: 10 percent of the period, clamped between 120 and 3600 seconds.</span>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="sched-max">Max runtime (seconds)</label>
        <input id="sched-max" className="input" type="number" min="60" value={maxRuntime} onChange={(e) => setMaxRuntime(e.target.value)} aria-invalid={errors.max_runtime_seconds ? "true" : "false"} />
        {errors.max_runtime_seconds && <span className="field-error">{errors.max_runtime_seconds}</span>}
        <span className="field-hint">A run past this long is marked Timed-out.</span>
      </div>
      <p className="field-hint">Editing a schedule affects expected-run math from the save forward; past runs and alerts are untouched.</p>
      <div className="row-actions">
        <button type="button" className={`btn${saving ? " is-loading" : ""}`} disabled={saving} onClick={save}>Save schedule</button>
        <button type="button" className="btn-text" onClick={reset}>Cancel</button>
      </div>
    </div>
  );
}
