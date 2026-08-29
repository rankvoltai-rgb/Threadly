import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // users, authAccounts, authSessions, … — owned by Convex Auth.
  ...authTables,

  /**
   * A purchase. `visitorId` is the browser that bought it; `email` comes from
   * Stripe and is what makes a purchase recoverable after a cookie clear.
   */
  licenses: defineTable({
    visitorId: v.string(),
    stripeSessionId: v.string(),
    email: v.optional(v.string()),
    amountCents: v.number(),
    createdAt: v.number(),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_session", ["stripeSessionId"])
    .index("by_email", ["email"]),

  /** Free-trial consumption, tracked server-side so clearing a cookie is not a reset. */
  trials: defineTable({
    visitorId: v.string(),
    leadsUsed: v.number(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_visitor", ["visitorId"]),

  /**
   * One row per (keyword, window) scrape. Lets a repeat search skip Apify
   * entirely — both the 20-60s wait and the per-run charge.
   */
  searches: defineTable({
    cacheKey: v.string(),
    keywords: v.array(v.string()),
    daysBack: v.number(),
    leadCount: v.number(),
    ranAt: v.number(),
  }).index("by_cache_key", ["cacheKey"]),

  /** Scraped posts belonging to a cached search. */
  cachedLeads: defineTable({
    searchId: v.id("searches"),
    postId: v.string(),
    username: v.string(),
    fullName: v.optional(v.string()),
    isVerified: v.boolean(),
    text: v.string(),
    likeCount: v.number(),
    replyCount: v.number(),
    date: v.string(),
    timestamp: v.number(),
    url: v.string(),
    profileUrl: v.string(),
    score: v.number(),
    signals: v.array(v.string()),
  }).index("by_search", ["searchId"]),

  /** A prospect's own site, analysed once into an ICP and cached. */
  icpProfiles: defineTable({
    visitorId: v.string(),
    url: v.string(),
    business: v.string(),
    sells: v.string(),
    idealCustomer: v.string(),
    keywords: v.array(v.string()),
    analysedAt: v.number(),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_url", ["url"]),

  /** A lead the user is working, with pipeline state. */
  savedLeads: defineTable({
    visitorId: v.string(),
    postId: v.string(),
    username: v.string(),
    fullName: v.optional(v.string()),
    text: v.string(),
    url: v.string(),
    profileUrl: v.string(),
    score: v.number(),
    postedAt: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("replied"),
      v.literal("won"),
      v.literal("dead")
    ),
    notes: v.optional(v.string()),
    savedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_visitor_post", ["visitorId", "postId"])
    .index("by_visitor_status", ["visitorId", "status"]),
});
