// The selected project, shared by the topbar switcher and every app
// page. The switcher writes a cookie; pages read it here and fall
// back to the oldest project. A stale or foreign id falls back too,
// so a bad cookie never 404s the dashboard.
import { cookies } from "next/headers";
import { SELECTED_COOKIE } from "./constants.js";

export async function resolveSelectedProject(store, userId) {
  const projects = await store.listProjectsByOwner(userId);
  if (!projects.length) return { projects, selected: null };
  const cookieStore = await cookies();
  const wanted = cookieStore.get(SELECTED_COOKIE)?.value;
  const selected = projects.find((p) => p.id === wanted) ?? projects[0];
  return { projects, selected };
}
