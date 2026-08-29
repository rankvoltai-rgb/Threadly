import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

/**
 * Next 16 renamed Middleware to Proxy; the API is unchanged.
 * The landing page stays public — anonymous visitors still get their 10 free
 * leads. Only the CRM sits behind an account.
 */
const isProtected = createRouteMatcher(["/dashboard(.*)"]);
const isSignIn = createRouteMatcher(["/signin"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();
  if (isProtected(request) && !authed) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
  if (isSignIn(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
