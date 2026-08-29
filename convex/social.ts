import { query } from "./_generated/server";
import { v } from "convex/values";

/** ri****@gmail.com — enough to feel real, not enough to identify anyone. */
function maskEmail(email: string | undefined) {
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@");
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(3, Math.min(6, local.length - 2)))}@${domain}`;
}

/**
 * Real purchases only, newest first, for the social-proof banner.
 * Returns an empty list until someone actually buys — the banner then shows
 * live product activity instead of inventing customers.
 */
export const recentPurchases = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db.query("licenses").order("desc").take(Math.min(limit ?? 30, 50));
    return rows
      .map((r) => ({
        email: maskEmail(r.email),
        amountCents: r.amountCents,
        createdAt: r.createdAt,
      }))
      .filter((r) => r.email !== null);
  },
});

/** Genuine usage figures, used when there are no purchases to show yet. */
export const activity = query({
  args: {},
  handler: async (ctx) => {
    const weekAgo = Date.now() - 7 * 864e5;
    const searches = await ctx.db.query("searches").order("desc").take(300);
    const recent = searches.filter((s) => s.ranAt >= weekAgo);
    const savedLeads = await ctx.db.query("savedLeads").take(500);

    return {
      leadsFound: recent.reduce((sum, s) => sum + s.leadCount, 0),
      searchesRun: recent.length,
      leadsSaved: savedLeads.length,
      lastSearchAt: searches[0]?.ranAt ?? null,
    };
  },
});
