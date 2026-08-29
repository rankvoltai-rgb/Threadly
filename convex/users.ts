import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** The signed-in user, or null for anonymous visitors. */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return { userId: userId as string, email: user?.email ?? null };
  },
});
