// Onboarding (/onboarding). One route, three steps. Signed-in
// only. ?project=<id>&step=3 opens step 3 for that project (the
// Settings "Setup snippet" entry).
import { redirect } from "next/navigation";
import Topbar from "../../components/Topbar.js";
import OnboardingFlow from "./OnboardingFlow.js";
import { getSessionUser, requireOwnProject } from "@/lib/auth.js";
import { createStore } from "@/lib/store.js";
import { isConfigured } from "@/lib/db.js";

export default async function OnboardingPage({ searchParams }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  let project = null;
  let initialStep = 1;
  if (typeof sp?.project === "string" && sp?.step === "3" && isConfigured()) {
    try {
      const store = createStore();
      project = await requireOwnProject(store, user.id, sp.project);
      initialStep = 3;
    } catch {
      // A bad or foreign project id falls back to step 1; the flow
      // never leaks whether the id exists.
      project = null;
      initialStep = 1;
    }
  }

  return (
    <>
      <Topbar variant="app" />
      <main className="wrap">
        <div className="center-card">
          <div className="card">
            <OnboardingFlow initialStep={initialStep} project={project} />
          </div>
        </div>
      </main>
    </>
  );
}
