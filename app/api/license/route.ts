import { NextResponse } from "next/server";
import { readVisitorId, resolveEntitlement } from "@/lib/entitlement";

export async function GET() {
  const visitorId = await readVisitorId();
  const ent = await resolveEntitlement(visitorId);
  return NextResponse.json({
    licensed: ent.licensed,
    licensedEmail: ent.licensedEmail,
    trialUsed: ent.leadsUsed,
    freeLimit: ent.freeLimit,
    trialRemaining: ent.licensed ? null : ent.trialRemaining,
    backend: ent.backend,
  });
}
