import test from "node:test";
import assert from "node:assert/strict";
import { newRawKey, hashKey, keysEqual } from "../lib/keys.js";

test("keys: raw key has prefix, hash is deterministic hex", () => {
  const raw = newRawKey();
  assert.ok(raw.startsWith("co_"));
  assert.equal(hashKey(raw), hashKey(raw));
  assert.match(hashKey(raw), /^[0-9a-f]{64}$/);
  assert.notEqual(hashKey(raw), hashKey(newRawKey()));
});

test("keysEqual: constant-time compare semantics", () => {
  assert.equal(keysEqual("abc", "abc"), true);
  assert.equal(keysEqual("abc", "abd"), false);
  assert.equal(keysEqual("abc", "abcd"), false);
});
