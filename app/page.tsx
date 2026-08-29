import Dashboard from "@/components/Dashboard";
import { readVisitorId, resolveEntitlement } from "@/lib/entitlement";
import { convexEnabled, getConvex, fns } from "@/lib/convex";
import type { SavedLead } from "@/components/Pipeline";
import type { Icp } from "@/components/Dashboard";

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

/** The visitor's last analysed website, so their keywords survive a reload. */
async function loadIcp(visitorId: string | null): Promise<Icp | null> {
  const convex = getConvex();
  if (!convex || !visitorId) return null;
  try {
    const row = await convex.query(fns.icpGet, { visitorId });
    if (!row) return null;
    return {
      url: row.url,
      business: row.business,
      sells: row.sells,
      idealCustomer: row.idealCustomer,
      keywords: row.keywords,
    };
  } catch (err) {
    console.error("[threadly] initial icp load failed:", err);
    return null;
  }
}

export default async function Page({ searchParams }: PageProps<"/">) {
  const visitorId = await readVisitorId();
  const [ent, initialSaved, initialIcp, params] = await Promise.all([
    resolveEntitlement(visitorId),
    loadSaved(visitorId),
    loadIcp(visitorId),
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
      initialIcp={initialIcp}
    />
  );
}
