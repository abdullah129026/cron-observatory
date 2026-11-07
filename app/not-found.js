// Not found: any unknown route. Signed-in users go back to the
// dashboard; signed-out users go home.
import Link from "next/link";
import Topbar from "../components/Topbar.js";
import { getSessionUser } from "@/lib/auth.js";

export default async function NotFound() {
  const user = await getSessionUser();
  return (
    <>
      <Topbar variant={user ? "app" : "landing"} />
      <main className="wrap">
        <div className="center-card">
          <div className="card">
            <div className="form-stack">
              <h1 className="title">Page not found.</h1>
              <p className="muted">This page does not exist or moved.</p>
              <div>
                {user ? (
                  <Link href="/dashboard" className="btn">Back to dashboard</Link>
                ) : (
                  <Link href="/" className="btn">Back to home</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
