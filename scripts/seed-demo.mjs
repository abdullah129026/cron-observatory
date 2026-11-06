// Seed the demo project for the landing page and screenshots.
// Run once, after the migrations: the demo strip and the job table
// render from real data only (DESIGN-COPY 1), so this script is the
// source of that data.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SEED_USER_EMAIL=... node scripts/seed-demo.mjs
//
// Prints the demo API key once (it is a demo key for a demo project).
// Re-running exits early when the demo project already exists.
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_USER_EMAIL } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SEED_USER_EMAIL) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SEED_USER_EMAIL.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Deterministic pseudo-random, so a re-seed looks the same.
let seed = 42;
function rnd() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

const { data: users, error: userErr } = await db.auth.admin.listUsers();
if (userErr) throw userErr;
const user = users.users.find((u) => u.email === SEED_USER_EMAIL);
if (!user) {
  console.error(`No auth user with email ${SEED_USER_EMAIL}. Sign in once first.`);
  process.exit(1);
}

const { data: existing } = await db.from("projects").select("id")
  .eq("owner_id", user.id).eq("name", "demo").is("deleted_at", null).maybeSingle();
if (existing) {
  console.log("Demo project already exists, nothing seeded.");
  process.exit(0);
}

const { data: project, error: pErr } = await db.from("projects")
  .insert({ owner_id: user.id, name: "demo" }).select().single();
if (pErr) throw pErr;

const rawKey = `co_${crypto.randomBytes(24).toString("base64url")}`;
const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
const { error: kErr } = await db.from("api_keys")
  .insert({ project_id: project.id, name: "demo key", key_hash: keyHash });
if (kErr) throw kErr;

const now = Date.now();
const day = 86400000;

async function seedJob(name, fields, runDays, failDays) {
  const { data: job, error } = await db.from("jobs")
    .insert({ project_id: project.id, name, ...fields }).select().single();
  if (error) throw error;
  const runs = [];
  for (let i = runDays - 1; i >= 0; i--) {
    const started = new Date(now - i * day - 3 * 3600000); // 3am-ish
    const failed = failDays.includes(i);
    const duration = Math.round(40000 + rnd() * 80000);
    runs.push({
      project_id: project.id,
      job_id: job.id,
      run_uuid: crypto.randomUUID(),
      started_at: started.toISOString(),
      finished_at: new Date(started.getTime() + duration).toISOString(),
      status: failed ? "failed" : "success",
      duration_ms: duration,
      exit_error: failed ? "Error: backup upload failed: ECONNRESET" : null,
      log_excerpt: failed ? "pg_dump done (412 MB)\nuploading to s3://backups/...\nError: backup upload failed: ECONNRESET" : null,
    });
  }
  const { error: rErr } = await db.from("runs").insert(runs);
  if (rErr) throw rErr;
  return job;
}

// nightly-backup: 30 days, failed 5 and 12 days ago.
const backup = await seedJob("nightly-backup", {
  schedule_kind: "cron", cron_expr: "0 3 * * *", timezone: "Asia/Karachi",
  grace_seconds: 300, max_runtime_seconds: 3600,
  expected_next_run: new Date(now + day - 3 * 3600000).toISOString(),
}, 30, [5, 12]);

// One resolved failure alert, so the alert history is not empty.
const { data: failedRun } = await db.from("runs").select("id, started_at")
  .eq("job_id", backup.id).eq("status", "failed")
  .order("started_at", { ascending: false }).limit(1).single();
if (failedRun) {
  await db.from("alerts").insert({
    project_id: project.id, job_id: backup.id, run_id: failedRun.id,
    kind: "failure", channel: "slack",
    message: "Cron job failed: nightly-backup (demo)",
    sent_at: failedRun.started_at, resolved_at: new Date(now - 4 * day).toISOString(),
  });
}

// heartbeat-5m: interval job, green for the last day (96 runs).
const heartbeat = await seedJob("heartbeat-5m", {
  schedule_kind: "interval", period_seconds: 300, timezone: "UTC",
  grace_seconds: 120, max_runtime_seconds: 600,
  expected_next_run: new Date(now + 300000).toISOString(),
}, 0, []);
{
  const runs = [];
  for (let i = 96; i >= 0; i--) {
    const started = new Date(now - i * 300000);
    const duration = Math.round(200 + rnd() * 800);
    runs.push({
      project_id: project.id, job_id: heartbeat.id, run_uuid: crypto.randomUUID(),
      started_at: started.toISOString(),
      finished_at: new Date(started.getTime() + duration).toISOString(),
      status: "success", duration_ms: duration,
    });
  }
  const { error } = await db.from("runs").insert(runs);
  if (error) throw error;
}

console.log(`Seeded demo project ${project.id} for ${SEED_USER_EMAIL}.`);
console.log(`Demo API key (shown once): ${rawKey}`);
console.log("Jobs: nightly-backup (30 days, 2 failures), heartbeat-5m (last day, green).");
