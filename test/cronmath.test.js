import test from "node:test";
import assert from "node:assert/strict";
import { parseCron, nextOccurrence, prevOccurrence, cronWindow, intervalWindow, isValidTimezone } from "../lib/cronmath.js";

const utc = (s) => new Date(s);

test("parse: five fields, steps, lists, ranges, names", () => {
  const c = parseCron("*/15 9-17 * * mon-fri");
  assert.equal(c.minute.length, 4);
  assert.deepEqual(c.hour, [9, 10, 11, 12, 13, 14, 15, 16, 17]);
  assert.deepEqual(c.dow, [1, 2, 3, 4, 5]);
  assert.equal(parseCron("0 3 * * *").minute[0], 0);
});

test("parse: rejects bad expressions", () => {
  for (const bad of ["0 3 * *", "61 3 * * *", "0 25 * * *", "x 3 * * *", "0 3 * * 8", "0/0 3 * * *"]) {
    assert.throws(() => parseCron(bad), /cron:/, bad);
  }
});

test("next occurrence: daily 03:00 in Asia/Karachi", () => {
  const cron = parseCron("0 3 * * *");
  // 2026-11-05 22:00 UTC is 2026-11-06 03:00 PKT exactly; strictly after means next day.
  const next = nextOccurrence(cron, utc("2026-11-05T22:00:00Z"), "Asia/Karachi");
  assert.equal(next.toISOString(), "2026-11-06T22:00:00.000Z");
  const before = nextOccurrence(cron, utc("2026-11-05T21:59:00Z"), "Asia/Karachi");
  assert.equal(before.toISOString(), "2026-11-05T22:00:00.000Z");
});

test("prev occurrence: last 03:00 before now", () => {
  const cron = parseCron("0 3 * * *");
  const prev = prevOccurrence(cron, utc("2026-11-06T10:00:00Z"), "Asia/Karachi");
  assert.equal(prev.toISOString(), "2026-11-05T22:00:00.000Z");
});

test("dst_transition: spring-forward gap has no occurrence", () => {
  // America/New_York springs forward 2026-03-08: 02:00-02:59 does not exist.
  const cron = parseCron("30 2 * * *");
  const next = nextOccurrence(cron, utc("2026-03-07T12:00:00Z"), "America/New_York");
  assert.equal(next.toISOString(), "2026-03-09T06:30:00.000Z"); // Mar 9, 02:30 EDT
});

test("dst_transition: fall-back repeated hour is one window", () => {
  // 2026-11-01: 01:00-01:59 happens twice in America/New_York.
  const cron = parseCron("30 1 * * *");
  const first = nextOccurrence(cron, utc("2026-10-31T12:00:00Z"), "America/New_York");
  assert.equal(first.toISOString(), "2026-11-01T05:30:00.000Z"); // first 01:30 (EDT)
  const second = nextOccurrence(cron, first, "America/New_York");
  assert.equal(second.toISOString(), "2026-11-02T06:30:00.000Z"); // next day, no second window
  const prev = prevOccurrence(cron, utc("2026-11-01T07:00:00Z"), "America/New_York");
  assert.equal(prev.toISOString(), "2026-11-01T05:30:00.000Z");
});

test("cronWindow: last and next around now", () => {
  const w = cronWindow("0 3 * * *", "Asia/Karachi", utc("2026-11-06T10:00:00Z"));
  assert.equal(w.last.toISOString(), "2026-11-05T22:00:00.000Z");
  assert.equal(w.next.toISOString(), "2026-11-06T22:00:00.000Z");
});

test("intervalWindow: anchored on last start", () => {
  const last = utc("2026-11-06T09:00:00Z");
  const w = intervalWindow(last, 300, utc("2026-11-06T09:12:00Z"));
  assert.equal(w.last.toISOString(), "2026-11-06T09:10:00.000Z");
  assert.equal(w.next.toISOString(), "2026-11-06T09:15:00.000Z");
  assert.deepEqual(intervalWindow(null, 300, utc("2026-11-06T09:12:00Z")), { last: null, next: null });
});

test("isValidTimezone", () => {
  assert.equal(isValidTimezone("Asia/Karachi"), true);
  assert.equal(isValidTimezone("America/New_York"), true);
  assert.equal(isValidTimezone("Not/AZone"), false);
  assert.equal(isValidTimezone(""), false);
});
