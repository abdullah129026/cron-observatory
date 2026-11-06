import test from "node:test";
import assert from "node:assert/strict";
import { deriveStatus, consecutiveFailures, percentile, withSyntheticMissed, tickStrip } from "../lib/state.js";

const now = new Date("2026-11-06T10:00:00Z");

test("deriveStatus: open alert wins over everything", () => {
  assert.equal(deriveStatus({ hasFinishedRun: true, hasSchedule: true, openAlertKind: "failure", hasRunningRun: true }, now), "down");
  assert.equal(deriveStatus({ hasFinishedRun: true, hasSchedule: true, openAlertKind: "timeout" }, now), "timed_out");
});

test("deriveStatus: running run is Up", () => {
  assert.equal(deriveStatus({ hasFinishedRun: true, hasSchedule: true, hasRunningRun: true }, now), "up");
});

test("deriveStatus: New when no finished run or no schedule", () => {
  assert.equal(deriveStatus({ hasFinishedRun: false, hasSchedule: true }, now), "new");
  assert.equal(deriveStatus({ hasFinishedRun: true, hasSchedule: false }, now), "new");
});

test("grace_boundary: inside grace is Late, past grace is Down", () => {
  const lastExpected = new Date("2026-11-06T09:50:00Z");
  const base = { hasFinishedRun: true, hasSchedule: true, lastExpected, graceSeconds: 600 };
  assert.equal(deriveStatus(base, new Date("2026-11-06T09:59:59Z")), "late");
  assert.equal(deriveStatus(base, new Date("2026-11-06T10:00:00Z")), "late");
  assert.equal(deriveStatus(base, new Date("2026-11-06T10:00:01Z")), "down");
});

test("deriveStatus: on time is Up", () => {
  assert.equal(deriveStatus({ hasFinishedRun: true, hasSchedule: true, lastExpected: new Date("2026-11-06T10:30:00Z") }, now), "up");
});

test("consecutiveFailures: counts newest-first, stops at success", () => {
  assert.equal(consecutiveFailures([{ status: "failed" }, { status: "failed" }, { status: "success" }]), 2);
  assert.equal(consecutiveFailures([{ status: "success" }, { status: "failed" }]), 0);
  assert.equal(consecutiveFailures([{ synthetic: "missed" }, { status: "timed_out" }, { status: "success" }]), 2);
  assert.equal(consecutiveFailures([]), 0);
});

test("percentile: p95 of durations", () => {
  assert.equal(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 0.95), 100);
  assert.equal(percentile([5], 0.95), 5);
  assert.equal(percentile([], 0.95), null);
});

test("withSyntheticMissed: merges and sorts, flags synthetic rows", () => {
  const runs = [{ id: "r1", started_at: "2026-11-06T09:00:00Z", status: "success" }];
  const missed = [{ id: "a1", created_at: "2026-11-06T09:30:00Z" }];
  const merged = withSyntheticMissed(runs, missed);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].synthetic, "missed");
  assert.equal(merged[0].status, "missed");
  assert.equal(merged[1].id, "r1");
});

test("tickStrip: down day beats up day, empty day is none", () => {
  const runs = [
    { started_at: "2026-11-05T03:00:00Z", status: "success" },
    { started_at: "2026-11-05T04:00:00Z", status: "failed" },
    { started_at: "2026-11-06T03:00:00Z", status: "success" },
  ];
  const strip = tickStrip(runs, [], 3, new Date("2026-11-06T12:00:00Z"));
  assert.deepEqual(strip.map((t) => t.status), ["none", "down", "up"]);
});
