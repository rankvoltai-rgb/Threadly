import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

/**
 * Convex is wired through typed function references rather than the generated
 * `api` object. Same runtime behaviour, but the app compiles and runs before
 * `npx convex dev` has ever created a deployment — and degrades to cookie-only
 * mode when CONVEX_URL is absent instead of crashing.
 */
export function convexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "";
}

export function convexEnabled() {
  return convexUrl().startsWith("http");
}

let client: ConvexHttpClient | null = null;
export function getConvex(): ConvexHttpClient | null {
  if (!convexEnabled()) return null;
  if (!client) client = new ConvexHttpClient(convexUrl());
  return client;
}

export type LeadRow = {
  postId: string;
  username: string;
  fullName?: string;
  isVerified: boolean;
  text: string;
  likeCount: number;
  replyCount: number;
  date: string;
  timestamp: number;
  url: string;
  profileUrl: string;
  score: number;
  signals: string[];
};

export type SavedStatus = "new" | "contacted" | "replied" | "won" | "dead";

export type SavedLead = LeadRow & {
  _id: string;
  status: SavedStatus;
  notes?: string;
  postedAt: string;
  savedAt: number;
};

export const fns = {
  entitlementGet: makeFunctionReference<
    "query",
    { visitorId: string },
    {
      licensed: boolean;
      licensedEmail: string | null;
      leadsUsed: number;
      freeLimit: number;
      trialRemaining: number | null;
    }
  >("entitlements:get"),

  consumeTrial: makeFunctionReference<
    "mutation",
    { visitorId: string; leads: number },
    { leadsUsed: number }
  >("entitlements:consumeTrial"),

  grantLicense: makeFunctionReference<
    "mutation",
    { visitorId: string; stripeSessionId: string; email?: string; amountCents: number },
    { licenseId: string; alreadyGranted: boolean }
  >("entitlements:grantLicense"),

  restoreByEmail: makeFunctionReference<
    "mutation",
    { visitorId: string; email: string },
    { restored: boolean }
  >("entitlements:restoreByEmail"),

  cacheGet: makeFunctionReference<
    "query",
    { cacheKey: string },
    { ranAt: number; leads: LeadRow[] } | null
  >("cache:get"),

  cacheSave: makeFunctionReference<
    "mutation",
    { cacheKey: string; keywords: string[]; daysBack: number; leads: LeadRow[] },
    { searchId: string }
  >("cache:save"),

  savedList: makeFunctionReference<"query", { visitorId: string }, SavedLead[]>(
    "savedLeads:list"
  ),

  savedSave: makeFunctionReference<
    "mutation",
    {
      visitorId: string;
      postId: string;
      username: string;
      fullName?: string;
      text: string;
      url: string;
      profileUrl: string;
      score: number;
      postedAt: string;
    },
    { id: string; alreadySaved: boolean }
  >("savedLeads:save"),

  savedSetStatus: makeFunctionReference<
    "mutation",
    { visitorId: string; postId: string; status: SavedStatus },
    { updated: boolean }
  >("savedLeads:setStatus"),

  savedSetNotes: makeFunctionReference<
    "mutation",
    { visitorId: string; postId: string; notes: string },
    { updated: boolean }
  >("savedLeads:setNotes"),

  savedRemove: makeFunctionReference<
    "mutation",
    { visitorId: string; postId: string },
    { removed: boolean }
  >("savedLeads:remove"),
};

export function cacheKeyFor(keywords: string[], daysBack: number) {
  return `${daysBack}:${[...keywords].map((k) => k.toLowerCase().trim()).sort().join("|")}`;
}
