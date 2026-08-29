import { NextResponse } from "next/server";
import { ensureVisitorId } from "@/lib/entitlement";
import { getConvex, fns } from "@/lib/convex";
import { signLicense, LICENSE_COOKIE } from "@/lib/license";

/** Recovers a lifetime purchase on a new browser using the email Stripe collected. */
export async function POST(req: Request) {
  const convex = getConvex();
  if (!convex) {
    return NextResponse.json(
      { error: "Purchase recovery needs Convex configured.", code: "convex_not_configured" },
      { status: 503 }
    );
  }

  let email = "";
  try {
    email = String((await req.json())?.email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter the email you paid with." }, { status: 400 });
  }

  const res = NextResponse.json({ restored: true });
  const visitorId = await ensureVisitorId(res);

  try {
    const out = await convex.mutation(fns.restoreByEmail, { visitorId, email });
    if (!out.restored) {
      return NextResponse.json(
        { error: "No purchase found for that email.", restored: false },
        { status: 404 }
      );
    }
    res.cookies.set(LICENSE_COOKIE, signLicense(`restore:${email}`), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 3650,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("[threadly] restore failed:", err);
    return NextResponse.json({ error: "Could not restore purchase." }, { status: 502 });
  }
}
