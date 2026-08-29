import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import type { NextResponse } from "next/server";
import { getConvex, fns } from "./convex";
import {
  verifyLicense,
  LICENSE_COOKIE,
  TRIAL_COOKIE,
  FREE_LEAD_LIMIT,
} from "./license";

export const VISITOR_COOKIE = "threadly_visitor";

const YEAR = 60 * 60 * 24 * 365;

export async function readVisitorId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(VISITOR_COOKIE)?.value ?? null;
}

/**
 * Server components cannot set cookies, so a visitor id is minted by the first
 * route handler the browser touches and attached to that response.
 */
export async function ensureVisitorId(res: NextResponse): Promise<string> {
  const existing = await readVisitorId();
  if (existing) return existing;
  const id = randomUUID();
  res.cookies.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: YEAR * 10,
    path: "/",
  });
  return id;
}

export type Entitlement = {
  licensed: boolean;
  licensedEmail: string | null;
  leadsUsed: number;
  freeLimit: number;
  trialRemaining: number;
  backend: "convex" | "cookie";
};

async function cookieEntitlement(): Promise<Entitlement> {
  const jar = await cookies();
  const licensed = verifyLicense(jar.get(LICENSE_COOKIE)?.value);
  const raw = Number(jar.get(TRIAL_COOKIE)?.value || 0);
  const leadsUsed = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  return {
    licensed,
    licensedEmail: null,
    leadsUsed,
    freeLimit: FREE_LEAD_LIMIT,
    trialRemaining: Math.max(0, FREE_LEAD_LIMIT - leadsUsed),
    backend: "cookie",
  };
}

/**
 * Convex is the source of truth when configured. If it is unreachable the app
 * falls back to the signed cookies rather than locking a paying user out.
 */
export async function resolveEntitlement(visitorId: string | null): Promise<Entitlement> {
  const convex = getConvex();
  if (convex && visitorId) {
    try {
      const e = await convex.query(fns.entitlementGet, { visitorId });
      return {
        licensed: e.licensed,
        licensedEmail: e.licensedEmail,
        leadsUsed: e.leadsUsed,
        freeLimit: e.freeLimit,
        trialRemaining: e.trialRemaining ?? 0,
        backend: "convex",
      };
    } catch (err) {
      console.error("[threadly] Convex entitlement lookup failed, using cookies:", err);
    }
  }
  const fallback = await cookieEntitlement();
  // A cookie licence still counts when Convex is on but has no record yet.
  return fallback;
}

export async function recordTrialUse(
  visitorId: string,
  leads: number,
  res: NextResponse,
  currentUsed: number
) {
  if (leads <= 0) return;
  const convex = getConvex();
  if (convex) {
    try {
      await convex.mutation(fns.consumeTrial, { visitorId, leads });
      return;
    } catch (err) {
      console.error("[threadly] Convex trial write failed, using cookie:", err);
    }
  }
  res.cookies.set(TRIAL_COOKIE, String(currentUsed + leads), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: YEAR,
    path: "/",
  });
}
