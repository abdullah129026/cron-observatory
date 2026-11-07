// App chrome: one slim topbar, not a sidebar. Brand plus wordmark,
// nav links, project switcher, sign out. Landing and legal pages use
// the landing variant (Docs, Sign in, primary CTA).
import Link from "next/link";
import { createStore } from "@/lib/store.js";
import { getSessionUser } from "@/lib/auth.js";
import { isConfigured } from "@/lib/db.js";
import { resolveSelectedProject } from "@/lib/selected.js";
import RadarMark from "./RadarMark.js";
import { ProjectSwitcher, SignOutButton } from "./topbar-client.js";

const APP_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docs", label: "Docs" },
  { href: "/settings", label: "Settings" },
];

export default async function Topbar({ variant = "app", active }) {
  if (variant === "landing") {
    return (
      <header className="topbar">
        <Link href="/" className="brand"><RadarMark />Cron Job Observatory</Link>
        <nav className="topbar-nav">
          <Link href="/docs" className="link">Docs</Link>
          <Link href="/login" className="btn-text">Sign in</Link>
        </nav>
        <div className="topbar-right">
          <Link href="/login" className="btn btn-sm">Get your API key</Link>
        </div>
      </header>
    );
  }

  let projects = [];
  let selected = null;
  let user = null;
  if (isConfigured()) {
    try {
      user = await getSessionUser();
      if (user) {
        const store = createStore();
        const resolved = await resolveSelectedProject(store, user.id);
        projects = resolved.projects;
        selected = resolved.selected;
      }
    } catch {
      // Topbar never breaks the page: a DB error shows no switcher.
      projects = [];
      selected = null;
    }
  }

  return (
    <header className="topbar">
      <Link href={user ? "/dashboard" : "/"} className="brand"><RadarMark />Cron Job Observatory</Link>
      <nav className="topbar-nav">
        {APP_NAV.map((item) => (
          <Link key={item.href} href={item.href} className={active === item.href ? "link link-active" : "link"} aria-current={active === item.href ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="topbar-right">
        {selected && <ProjectSwitcher projects={projects} selectedId={selected.id} />}
        {user && <SignOutButton />}
      </div>
    </header>
  );
}
