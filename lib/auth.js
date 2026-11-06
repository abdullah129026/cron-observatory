// Dashboard session auth via @supabase/ssr. Routes call
// requireSession() and get the signed-in user or a 401. Ownership is
// checked per row after that (projects.owner_id = user.id); the
// session alone never grants access to another account's data.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { InputError } from "./errors.js";

export async function getSessionUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options));
        } catch { /* setAll in a Server Component context; ignore */ }
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

export async function requireSession() {
  const user = await getSessionUser();
  if (!user) throw new InputError("unauthorized", "Sign in to continue.", 401);
  return user;
}

// Load a project the session owns. A bad id and another account's id
// fail the same way, so existence never leaks (docs 4).
export async function requireOwnProject(store, userId, projectId) {
  const project = await store.getProjectById(projectId);
  if (!project || project.deleted_at || project.owner_id !== userId) {
    throw new InputError("not_found", "Project not found.", 404);
  }
  return project;
}

export async function requireOwnJob(store, userId, jobId) {
  const job = await store.getJobById(jobId);
  if (!job || job.deleted_at) {
    throw new InputError("not_found", "Job not found.", 404);
  }
  const project = await requireOwnProject(store, userId, job.project_id);
  return { job, project };
}
