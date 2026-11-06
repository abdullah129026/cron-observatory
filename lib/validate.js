// Input validation. Every route validates every input here before
// touching the DB. Validators return a clean value or throw InputError
// with a message that names the fix.
import { InputError } from "./errors.js";

const MAX_NAME = 128;
const MAX_TEXT = 2000;

export function reqString(body, field, { max = MAX_NAME, optional = false } = {}) {
  const v = body[field];
  if (v === undefined || v === null) {
    if (optional) return null;
    throw new InputError("bad_request", `${field} is required.`);
  }
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new InputError("bad_request", `${field} must be a non-empty string.`);
  }
  if (v.length > max) {
    throw new InputError("bad_request", `${field} must be ${max} characters or fewer.`);
  }
  if (/[\u0000-\u001f\u007f]/.test(v)) {
    throw new InputError("bad_request", `${field} must not contain control characters.`);
  }
  return v.trim();
}

export function optString(body, field, max = MAX_TEXT) {
  const v = body[field];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") {
    throw new InputError("bad_request", `${field} must be a string.`);
  }
  if (v.length > max) {
    throw new InputError("bad_request", `${field} must be ${max} characters or fewer.`);
  }
  return v;
}

export function reqBool(body, field) {
  const v = body[field];
  if (typeof v !== "boolean") {
    throw new InputError("bad_request", `${field} must be true or false.`);
  }
  return v;
}

export function optInt(body, field, { min = 0, max = 86400, optional = true } = {}) {
  const v = body[field];
  if (v === undefined || v === null) {
    if (optional) return null;
    throw new InputError("bad_request", `${field} is required.`);
  }
  if (!Number.isInteger(v) || v < min || v > max) {
    throw new InputError(
      "bad_request",
      `${field} must be a whole number between ${min} and ${max}.`
    );
  }
  return v;
}

export function reqUuid(body, field) {
  const v = reqString(body, field, { max: 64 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    throw new InputError("bad_request", `${field} must be a UUID.`);
  }
  return v.toLowerCase();
}

export function reqHttpsUrl(body, field) {
  const v = reqString(body, field, { max: 2048 });
  let u;
  try {
    u = new URL(v);
  } catch {
    throw new InputError("bad_request", `${field} must be a valid URL.`);
  }
  if (u.protocol !== "https:") {
    throw new InputError("bad_request", `${field} must use https.`);
  }
  return u.toString();
}

// Job names are matched by the SDK, so they stay plain: letters,
// digits, spaces, dashes, underscores, dots.
export function reqJobName(body, field = "job") {
  const v = reqString(body, field);
  if (!/^[\w][\w .-]*$/.test(v)) {
    throw new InputError(
      "bad_request",
      `${field} may only contain letters, digits, spaces, dashes, underscores, and dots.`
    );
  }
  return v;
}

// Grace default rule (PLAN 0.1): 10 percent of the period, clamped
// between 120 and 3600 seconds.
export function defaultGrace(periodSeconds) {
  return Math.min(3600, Math.max(120, Math.round(periodSeconds * 0.1)));
}

// Cap a log excerpt at 2000 chars. The SDK never ships full stdout.
export function capExcerpt(text) {
  if (!text) return null;
  return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text;
}
