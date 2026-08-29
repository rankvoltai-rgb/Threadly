import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { FREE_LEAD_LIMIT } from "./constants";

/** Licence + trial state for one visitor. Safe to call on every page load. */
export const get = query({
  args: { visitorId: v.string() },
  handler: async (ctx, { visitorId }) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_visitor", (q) => q.eq("visitorId", visitorId))
      .first();

    const trial = await ctx.db
      .query("trials")
      .withIndex("by_visitor", (q) => q.eq("visitorId", visitorId))
      .first();

    const leadsUsed = trial?.leadsUsed ?? 0;
    return {
      licensed: license !== null,
      licensedEmail: license?.email ?? null,
      leadsUsed,
      freeLimit: FREE_LEAD_LIMIT,
      trialRemaining: license ? null : Math.max(0, FREE_LEAD_LIMIT - leadsUsed),
    };
  },
});

/** Records revealed leads against the trial. Returns the new remaining count. */
export const consumeTrial = mutation({
  args: { visitorId: v.string(), leads: v.number() },
  handler: async (ctx, { visitorId, leads }) => {
    if (leads <= 0) return { leadsUsed: 0 };
    const now = Date.now();
    const existing = await ctx.db
      .query("trials")
      .withIndex("by_visitor", (q) => q.eq("visitorId", visitorId))
      .first();

    if (!existing) {
      await ctx.db.insert("trials", {
        visitorId,
        leadsUsed: leads,
        firstSeenAt: now,
        lastSeenAt: now,
      });
      return { leadsUsed: leads };
    }

    const leadsUsed = existing.leadsUsed + leads;
    await ctx.db.patch(existing._id, { leadsUsed, lastSeenAt: now });
    return { leadsUsed };
  },
});

/** Called once Stripe confirms payment. Idempotent on the Stripe session id. */
export const grantLicense = mutation({
  args: {
    visitorId: v.string(),
    stripeSessionId: v.string(),
    email: v.optional(v.string()),
    amountCents: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("licenses")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .first();

    if (existing) {
      // Same purchase reaching a new browser — move it rather than duplicating.
      if (existing.visitorId !== args.visitorId) {
        await ctx.db.patch(existing._id, { visitorId: args.visitorId });
      }
      return { licenseId: existing._id, alreadyGranted: true };
    }

    const licenseId = await ctx.db.insert("licenses", {
      ...args,
      createdAt: Date.now(),
    });
    return { licenseId, alreadyGranted: false };
  },
});

/**
 * Recovers a purchase on a new browser. This is the answer to the cookie-clear
 * problem: the buyer proves ownership with the email they paid with.
 */
export const restoreByEmail = mutation({
  args: { visitorId: v.string(), email: v.string() },
  handler: async (ctx, { visitorId, email }) => {
    const normalized = email.trim().toLowerCase();
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();

    if (!license) return { restored: false };
    await ctx.db.patch(license._id, { visitorId });
    return { restored: true };
  },
});
