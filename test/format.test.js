// Formatting helpers: relative times, durations, clocks.
import test from "node:test";
import assert from "node:assert/strict";
import { relTime, fmtDuration } from "../lib/format.js";

const now = new Date("2026-11-07T09:52:00Z");

test("relTime: just now, minutes, hours, days, future", () => {
  assert.equal(relTime("2026-11-07T09:51:30Z", now), "just now");
  assert.equal(relTime("2026-11-07T09:47:00Z", now), "5m ago");
  assert.equal(relTime("2026-11-07T07:52:00Z", now), "2h ago");
  assert.equal(relTime("2026-11-04T09:52:00Z", now), "3d ago");
  assert.equal(relTime("2026-11-07T13:52:00Z", now), "in 4h");
  assert.equal(relTime(null, now), null);
});

test("fmtDuration: ms, seconds, minutes, hours", () => {
  assert.equal(fmtDuration(850), "850ms");
  assert.equal(fmtDuration(1200), "1.2s");
  assert.equal(fmtDuration(45000), "45s");
  assert.equal(fmtDuration(200000), "3m 20s");
  assert.equal(fmtDuration(3900000), "1h 5m");
  assert.equal(fmtDuration(null), null);
});
