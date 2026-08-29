import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { convexUrl, convexEnabled } from "./convex";
import { readVisitorId } from "./entitlement";

const currentUser = makeFunctionReference<
  "query",
  Record<string, never>,
  { userId: string; email: string | null } | null
>("users:current");

export type Identity = {
  /** Key everything (trials, licences, saved leads, ICP) off this. */
  key: string;
  userId: string | null;
  email: string | null;
  authed: boolean;
};

export async function getSignedInUser() {
  if (!convexEnabled()) return null;
  try {
    const token = await convexAuthNextjsToken();
    if (!token) return null;
    const client = new ConvexHttpClient(convexUrl());
    client.setAuth(token);
    return await client.query(currentUser, {});
  } catch (err) {
    console.error("[threadly] auth lookup failed:", err);
    return null;
  }
}

/**
 * An account beats a cookie: once signed in, the pipeline and licence follow the
 * person across browsers. Anonymous visitors keep working off the cookie so the
 * public landing page needs no signup.
 */
export async function resolveIdentity(): Promise<Identity> {
  const user = await getSignedInUser();
  if (user) {
    return { key: `user:${user.userId}`, userId: user.userId, email: user.email, authed: true };
  }
  const visitorId = await readVisitorId();
  return { key: visitorId ?? "", userId: null, email: null, authed: false };
}
