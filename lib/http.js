// Shared HTTP helpers for API routes: one error shape everywhere,
// one body-size cap (32KB, PLAN 0.1).
import { NextResponse } from "next/server";
import { InputError } from "./errors.js";

export { InputError };

export function err(code, message, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function ok(data, status = 200) {
  return NextResponse.json(data, { status });
}

// Read a JSON body with a byte cap. Throws InputError on oversize,
// malformed JSON, or a non-object body.
export async function readJson(req, maxBytes = 32 * 1024) {
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) {
    throw new InputError("body_too_large", "Request body is over 32KB.");
  }
  let body;
  try {
    body = JSON.parse(text || "{}");
  } catch {
    throw new InputError("bad_json", "Request body is not valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new InputError("bad_json", "Request body must be a JSON object.");
  }
  return body;
}

// Map a thrown error to a response. InputError carries its own code;
// anything else is a generic 500 that names no internals.
export function routeError(e) {
  if (e instanceof InputError) return err(e.code, e.message, e.status);
  return err("internal", "Something went wrong.", 500);
}
