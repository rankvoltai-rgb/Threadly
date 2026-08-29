import Dashboard from "@/components/Dashboard";
import { readVisitorId, resolveEntitlement } from "@/lib/entitlement";
import { convexEnabled, getConvex, fns } from "@/lib/convex";
import type { SavedLead } from "@/components/Pipeline";

export const dynamic = "force-dynamic";

/** Saved leads are server-rendered so the pipeline has no empty flash on load. */
async function loadSaved(visitorId: string | null): Promise<SavedLead[]> {
  const convex = getConvex();
  if (!convex || !visitorId) return [];
  try {
    return (await convex.query(fns.savedList, { visitorId })) as unknown as SavedLead[];
  } catch (err) {
    console.error("[threadly] initial saved-lead load failed:", err);
    return [];
  }
}

export default async function Page({ searchParams }: PageProps<"/">) {
  const visitorId = await readVisitorId();
  const [ent, initialSaved, params] = await Promise.all([
    resolveEntitlement(visitorId),
    loadSaved(visitorId),
    searchParams,
  ]);
  const checkout = typeof params.checkout === "string" ? params.checkout : undefined;

  return (
    <Dashboard
      initialLicensed={ent.licensed}
      initialTrialRemaining={ent.licensed ? ent.freeLimit : ent.trialRemaining}
      freeLimit={ent.freeLimit}
      checkoutStatus={checkout}
      convexEnabled={convexEnabled()}
      initialSaved={initialSaved}
    />
  );
}
