// Sign in (/login). Public; signed-in users go to /dashboard.
// A failed or expired magic link lands here with ?error=link and
// renders the same frame the callback spec names (docs 7).
import Link from "next/link";
import { redirect } from "next/navigation";
import Topbar from "../../components/Topbar.js";
import LoginForm from "./LoginForm.js";
import { getSessionUser } from "@/lib/auth.js";

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const linkFailed = sp?.error === "link";

  return (
    <>
      <Topbar variant="landing" />
      <main className="wrap">
        <div className="center-card">
          <div className="card">
            {linkFailed ? (
              <div className="form-stack">
                <h1 className="title">This link did not work.</h1>
                <p className="muted">Links expire and work only once. Request a new one.</p>
                <Link href="/login" className="btn">Back to sign in</Link>
              </div>
            ) : (
              <div className="form-stack">
                <h1 className="title">Sign in</h1>
                <p className="muted">Magic link, no password.</p>
                <LoginForm />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
