# Security checklist (OWASP basics, phase-3)

## Done in this phase

- [x] Input validation on every input (lib/validate.js): types, lengths,
      control characters, UUIDs, HTTPS-only webhook URLs, cron
      expressions parsed before storage, IANA timezones checked.
- [x] Request bodies capped at 32KB; log excerpts capped at 2000 chars.
- [x] Consistent error shape `{error: {code, message}}`; 500s name no
      internals; 404s do not leak existence (bad id and another
      account's id fail the same way).
- [x] API keys stored as SHA-256 hashes, raw key shown once, never
      logged. Keys rotate by revoke + create.
- [x] Slack webhook URLs encrypted with pgcrypto + a Vault key
      (SECURITY DEFINER RPCs, service_role only). URLs never logged;
      only the last 4 characters leave the server.
- [x] service_role stays server-side; dashboard reads go through RLS
      owner-scoped SELECT policies; writes go through API routes after
      a session + ownership check.
- [x] Explicit minimal GRANTs on every table (service_role CRUD,
      authenticated SELECT only). Never GRANT ALL to anon or
      authenticated.
- [x] Per-key rate limit 60 pings/min (429 beyond). 10-job account cap.
- [x] Bearer-gated check endpoint (CRON_SECRET); 401 without it.
- [x] Account delete requires the typed word DELETE, server-side.
- [x] No secrets in code, logs, or chat. Structured logs carry ids,
      never values.

## Known limits (honest, not hidden)

- Rate limiting is per-isolate in memory (lib/rate.js). A fleet of
  isolates lets a runaway key through at N x the limit. Move the
  counter to the DB if ingest ever runs hot.
- pg_net stages the decrypted CRON_SECRET in net.http_request_queue,
  readable by DB logins (PLAN 0.3, accepted for v1).
- `after()` on the Vercel Hobby tier is unverified: if alert sends do
  not fire from ingest, the check tick becomes the primary sender
  (phase-6 must confirm).
- The SDK sends error text and console output (capped) to the
  service. Do not log secrets inside wrapped jobs.
