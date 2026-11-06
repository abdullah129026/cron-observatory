// API keys: SHA-256 hash stored, raw key shown once, constant-time
// compare (PLAN ADR 4). A DB read must never yield a usable credential.
import crypto from "node:crypto";

export function newRawKey() {
  return `co_${crypto.randomBytes(24).toString("base64url")}`;
}

export function hashKey(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function keysEqual(a, b) {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
