// Shared error type for validation and auth failures. Lives apart
// from lib/http.js so pure-logic modules can throw it without
// pulling in next/server (tests import them in plain node).
export class InputError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
