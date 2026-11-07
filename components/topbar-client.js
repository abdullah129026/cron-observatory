"use client";

// Interactive topbar bits: the project switcher (a native select
// that writes the selection cookie and refreshes the page) and the
// sign-out button.
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser.js";
import { SELECTED_COOKIE } from "@/lib/constants.js";

export function ProjectSwitcher({ projects, selectedId }) {
  const router = useRouter();

  function change(e) {
    const id = e.target.value;
    document.cookie = `${SELECTED_COOKIE}=${id}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <select className="select select-sm" value={selectedId} onChange={change} aria-label="Project">
      {projects.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const client = browserClient();
    if (client) await client.auth.signOut();
    document.cookie = `${SELECTED_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" className="btn-text" onClick={signOut}>Sign out</button>
  );
}
