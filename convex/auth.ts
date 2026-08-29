import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Email + password only. Threadly's landing page stays anonymous; an account
 * exists purely so the CRM and a lifetime licence follow the person rather
 * than a cookie on one browser.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
