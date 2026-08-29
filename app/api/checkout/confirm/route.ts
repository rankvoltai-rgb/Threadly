import { NextResponse } from "next/server";
import { stripeConfigured, stripeRequest } from "@/lib/stripe";
import { signLicense, LICENSE_COOKIE } from "@/lib/license";
import { ensureVisitorId } from "@/lib/entitlement";
import { getConvex, fns } from "@/lib/convex";

/**
 * Stripe redirects here after payment. The session is re-fetched server-side so a
 * forged success_url cannot mint a license.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const home = new URL("/", url.origin);

  const fail = () => {
    home.searchParams.set("checkout", "failed");
    return NextResponse.redirect(home);
  };

  if (!sessionId || !stripeConfigured()) return fail();

  try {
    const session = await stripeRequest(`checkout/sessions/${sessionId}`, { method: "GET" });
    if (session.payment_status !== "paid") return fail();

    home.searchParams.set("checkout", "success");
    const res = NextResponse.redirect(home);
    const visitorId = await ensureVisitorId(res);

    const email: string | undefined =
      session.customer_details?.email?.trim().toLowerCase() || undefined;

    const convex = getConvex();
    if (convex) {
      try {
        await convex.mutation(fns.grantLicense, {
          visitorId,
          stripeSessionId: session.id,
          email,
          amountCents: session.amount_total ?? 2000,
        });
      } catch (err) {
        console.error("[threadly] Convex license write failed, using cookie:", err);
      }
    }

    // The signed cookie stays as a belt-and-braces unlock even when Convex is on.
    res.cookies.set(LICENSE_COOKIE, signLicense(session.id), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 3650,
      path: "/",
    });
    return res;
  } catch {
    return fail();
  }
}
