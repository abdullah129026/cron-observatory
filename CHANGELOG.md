# Changelog

## 0.1.0 — 2026-11-09

First launch-ready release.

- SDK: `wrap(name, { schedule, timezone }, fn)` pings start and finish, captures the failed-log excerpt, never throws, never stalls the job.
- Ingest: `POST /v1/runs/start` and `/v1/runs/finish`, per-project API-key auth, idempotent by `run_uuid`, 60 pings per minute per key, 10 jobs per account.
- Detection: a check tick compares each job's expected run against actual pings. Inside grace is Late, past grace is Down, a start with no finish past `max_runtime` is Timed-out. Missed runs render as synthetic rows in run history.
- Alerts: one Slack message per incident until recovery, claim-then-send so a crashed isolate never double-sends, unsent alerts retried by the tick with backoff.
- Dashboard: urgency-sorted job table with 30-day tick strips, job detail with run history, p50 chart, alert history, schedule settings, and danger zone.
- Settings: projects, API keys (shown once), Slack webhook (encrypted, test send, health), data export, and two-step typed-DELETE account delete.
- Docs, onboarding, landing with a live demo strip, Terms and Privacy.
