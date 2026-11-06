# cron-observatory-sdk

Zero-dependency Node wrapper. Pings Cron Job Observatory when a job
starts, succeeds, or fails.

```js
import { wrap } from "cron-observatory-sdk";

await wrap("nightly-backup", { schedule: "0 3 * * *", timezone: "Asia/Karachi" }, runBackup);
```

Set the key once: `CRON_API_KEY` env var, or `configure({ apiKey })`.
Set `CRON_BASE_URL` to point at a self-hosted copy.

Rules: `wrap` must be awaited. Pings never throw and never stall
your job (10s timeout, 3 retries, then a diagnostic on stderr).
A 429 (rate limit or the 10-job cap) is not retried. `process.exit()`
inside a wrapped job is unsupported: in-flight pings die with the
process. On failure the SDK sends the error text plus a capped log
excerpt (console output during the run, 2000 chars).
