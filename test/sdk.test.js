import test from "node:test";
import assert from "node:assert/strict";
import { wrap, configure } from "../sdk/index.js";

test("sdk_never_crashes_job: unreachable API leaves the job result untouched", async () => {
  configure({ apiKey: "co_test", baseUrl: "http://127.0.0.1:9" });
  const result = await wrap("job", async () => {
    console.log("working");
    return 42;
  });
  assert.equal(result, 42);
});

test("sdk_never_crashes_job: a throwing job still throws to the caller", async () => {
  configure({ apiKey: "co_test", baseUrl: "http://127.0.0.1:9" });
  await assert.rejects(
    wrap("job", async () => { throw new Error("job blew up"); }),
    (e) => e.message === "job blew up"
  );
});

test("sdk: 429 is non-retryable (one ping attempt)", async () => {
  let calls = 0;
  const realFetch = global.fetch;
  global.fetch = async () => { calls++; return { ok: false, status: 429 }; };
  try {
    configure({ apiKey: "co_test", baseUrl: "http://example.invalid" });
    const result = await wrap("job", async () => "ok");
    assert.equal(result, "ok");
  } finally {
    global.fetch = realFetch;
  }
  assert.equal(calls, 2); // start + finish, one attempt each
});

test("sdk: start and finish pings carry the same run_uuid", async () => {
  const bodies = [];
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    bodies.push(JSON.parse(opts.body));
    return { ok: true, status: 200 };
  };
  try {
    configure({ apiKey: "co_test", baseUrl: "http://example.invalid" });
    await wrap("nightly-backup", { schedule: "0 3 * * *", timezone: "Asia/Karachi" }, async () => {});
  } finally {
    global.fetch = realFetch;
  }
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].job, "nightly-backup");
  assert.equal(bodies[0].schedule, "0 3 * * *");
  assert.equal(bodies[0].timezone, "Asia/Karachi");
  assert.equal(bodies[1].run_uuid, bodies[0].run_uuid);
  assert.equal(bodies[1].ok, true);
});

test("sdk: wrap validates its arguments", async () => {
  await assert.rejects(wrap("", async () => {}), /job name is required/);
  await assert.rejects(wrap("job"), /a function to run is required/);
});
