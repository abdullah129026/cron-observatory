import test from "node:test";
import assert from "node:assert/strict";
import { reqString, optString, optInt, reqUuid, reqHttpsUrl, reqJobName, defaultGrace, capExcerpt } from "../lib/validate.js";
import { InputError } from "../lib/errors.js";

test("reqString: trims, rejects empty/oversize/control chars", () => {
  assert.equal(reqString({ name: "  demo " }, "name"), "demo");
  assert.throws(() => reqString({}, "name"), (e) => e instanceof InputError && e.code === "bad_request");
  assert.throws(() => reqString({ name: "   " }, "name"), InputError);
  assert.throws(() => reqString({ name: "x".repeat(129) }, "name"), InputError);
  assert.throws(() => reqString({ name: "a\nb" }, "name"), InputError);
  assert.equal(reqString({}, "name", { optional: true }), null);
});

test("reqJobName: plain names only", () => {
  assert.equal(reqJobName({ job: "nightly-backup_2" }, "job"), "nightly-backup_2");
  assert.throws(() => reqJobName({ job: "a/b" }, "job"), InputError);
  assert.throws(() => reqJobName({ job: "x;y" }, "job"), InputError);
});

test("reqUuid: strict UUID shape", () => {
  const id = "16b7e3e5-eb7e-4253-b455-3af04ee0ed18";
  assert.equal(reqUuid({ run_uuid: id }, "run_uuid"), id);
  assert.throws(() => reqUuid({ run_uuid: "not-a-uuid" }, "run_uuid"), InputError);
});

test("reqHttpsUrl: https only", () => {
  assert.equal(reqHttpsUrl({ webhook_url: "https://hooks.slack.com/x" }, "webhook_url"), "https://hooks.slack.com/x");
  assert.throws(() => reqHttpsUrl({ webhook_url: "http://hooks.slack.com/x" }, "webhook_url"), InputError);
  assert.throws(() => reqHttpsUrl({ webhook_url: "notaurl" }, "webhook_url"), InputError);
});

test("optInt: bounds and integer-only", () => {
  assert.equal(optInt({ grace_seconds: 300 }, "grace_seconds"), 300);
  assert.equal(optInt({}, "grace_seconds"), null);
  assert.throws(() => optInt({ grace_seconds: -1 }, "grace_seconds"), InputError);
  assert.throws(() => optInt({ grace_seconds: 1.5 }, "grace_seconds"), InputError);
});

test("defaultGrace: 10 percent of period, clamped 120-3600", () => {
  assert.equal(defaultGrace(3600), 360);
  assert.equal(defaultGrace(60), 120);
  assert.equal(defaultGrace(86400), 3600);
});

test("capExcerpt: caps at 2000 chars", () => {
  assert.equal(capExcerpt("x".repeat(3000)).length, 2000);
  assert.equal(capExcerpt(null), null);
  assert.equal(capExcerpt("short"), "short");
});
