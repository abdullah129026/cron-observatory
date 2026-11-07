"use client";

// Magic-link sign-in: no password to store. The link returns to
// /auth/callback, which exchanges the code for a session.
import { useState } from "react";
import { browserClient, authConfigured } from "@/lib/supabase-browser.js";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function send(targetEmail) {
    const client = browserClient();
    if (!client) {
      setError("Sign-in is not configured yet.");
      return;
    }
    setState("sending");
    setError("");
    const { error: err } = await client.auth.signInWithOtp({
      email: targetEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    if (err) {
      setError("Could not send the link. Try again.");
      setState("idle");
    } else {
      setState("sent");
      setResendIn(60);
      const timer = setInterval(() => {
        setResendIn((n) => {
          if (n <= 1) { clearInterval(timer); return 0; }
          return n - 1;
        });
      }, 1000);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!validEmail(email.trim())) {
      setFieldError("Enter a valid email address.");
      return;
    }
    setFieldError("");
    send(email.trim());
  }

  if (!authConfigured()) {
    return <p className="muted">Sign-in is not configured yet. Set the Supabase URL and anon key, then come back.</p>;
  }

  if (state === "sent") {
    return (
      <div className="form-stack">
        <p className="section-title">Check your inbox.</p>
        <p className="muted">The sign-in link is on its way to <span className="mono">{email}</span>.</p>
        <div>
          <button type="button" className="btn-text" disabled={resendIn > 0} onClick={() => send(email)}>
            Resend
          </button>
          {resendIn > 0 && <span className="caption"> Resend available after {resendIn} seconds.</span>}
        </div>
      </div>
    );
  }

  return (
    <form className="form-stack" onSubmit={submit} noValidate>
      {error && (
        <div className="banner banner-danger" role="alert">
          <span className="banner-body"><span className="banner-title">{error}</span></span>
        </div>
      )}
      <div className="field">
        <label className="field-label" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          className="input"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={fieldError ? "true" : "false"}
        />
        {fieldError && <span className="field-error">{fieldError}</span>}
      </div>
      <button type="submit" className={`btn${state === "sending" ? " is-loading" : ""}`} disabled={state === "sending"}>
        Send magic link
      </button>
    </form>
  );
}
