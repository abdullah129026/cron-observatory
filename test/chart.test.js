// Duration chart bucketing: p50 per bucket, empty buckets null.
import test from "node:test";
import assert from "node:assert/strict";
import { bucketP50 } from "../lib/chart.js";

const now = new Date("2026-11-07T12:00:00Z");
const runs = [
  { started_at: "2026-11-07T10:05:00Z", duration_ms: 100, status: "success" },
  { started_at: "2026-11-07T10:20:00Z", duration_ms: 300, status: "success" },
  { started_at: "2026-11-07T10:40:00Z", duration_ms: 200, status: "failed" },
  { started_at: "2026-11-07T11:10:00Z", duration_ms: 500, status: "success" },
  { started_at: "2026-11-07T11:30:00Z", duration_ms: 900, status: "running" },
  { started_at: "2026-11-06T11:30:00Z", duration_ms: 700, status: "success" },
];

test("bucketP50: 24h buckets by hour, running runs ignored", () => {
  const buckets = bucketP50(runs, "24h", now);
  assert.equal(buckets.length, 24);
  const ten = buckets.find((b) => b.label === "10:00");
  assert.equal(ten.p50, 200);
  const eleven = buckets.find((b) => b.label === "11:00");
  assert.equal(eleven.p50, 500);
  const midnight = buckets.find((b) => b.label === "12:00");
  assert.equal(midnight.p50, null);
});

test("bucketP50: 7d buckets by day, old runs outside the window ignored", () => {
  const buckets = bucketP50(runs, "7d", now);
  assert.equal(buckets.length, 7);
  const today = buckets[buckets.length - 1];
  assert.equal(today.p50, 200); // lower median of [100, 200, 300, 500]
});
