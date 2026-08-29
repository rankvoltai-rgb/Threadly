import Dashboard from "@/components/Dashboard";
import { resolveEntitlement } from "@/lib/entitlement";
import { FREE_LEAD_LIMIT } from "@/lib/license";
import { resolveIdentity } from "@/lib/identity";
import { convexEnabled, getConvex, fns } from "@/lib/convex";
import type { SavedLead } from "@/components/Pipeline";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const identity = await resolveIdentity();
  // Proxy already guards this route; this is the belt-and-braces check.
  if (!identity.authed) redirect("/signin");

  const convex = getConvex();
  const [ent, saved, icp, params] = await Promise.all([
    resolveEntitlement(identity.key),
    convex
      ? convex.query(fns.savedList, { visitorId: identity.key }).catch(() => [])
      : Promise.resolve([]),
    convex
      ? convex.query(fns.icpGet, { visitorId: identity.key }).catch(() => null)
      : Promise.resolve(null),
    searchParams,
  ]);

  const checkout = typeof params.checkout === "string" ? params.checkout : undefined;

  return (
    <Dashboard
      initialLicensed={ent.licensed}
      initialTrialRemaining={ent.licensed ? ent.freeLimit : ent.trialRemaining}
      freeLimit={FREE_LEAD_LIMIT}
      checkoutStatus={checkout}
      convexEnabled={convexEnabled()}
      initialSaved={saved as unknown as SavedLead[]}
      initialIcp={
        icp
          ? {
              url: icp.url,
              business: icp.business,
              sells: icp.sells,
              idealCustomer: icp.idealCustomer,
              keywords: icp.keywords,
            }
          : null
      }
      account={{ email: identity.email }}
      startView="pipeline"
    />
  );
}
