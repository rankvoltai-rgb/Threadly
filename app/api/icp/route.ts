import { NextResponse } from "next/server";
import { normaliseUrl, fetchSiteText } from "@/lib/icp";
import { analyseIcp, geminiEnabled } from "@/lib/gemini";
import { ensureVisitorId } from "@/lib/entitlement";
import { getConvex, fns } from "@/lib/convex";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!geminiEnabled()) {
    return NextResponse.json(
      { error: "Site analysis needs GEMINI_API_KEY configured.", code: "gemini_not_configured" },
      { status: 503 }
    );
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = normaliseUrl(body.url || "");
  if (!url) {
    return NextResponse.json(
      { error: "Enter a valid public website address, e.g. acme.com" },
      { status: 400 }
    );
  }

  const carrier = NextResponse.json({});
  const visitorId = await ensureVisitorId(carrier);
  const convex = getConvex();

  // A site's ICP barely changes, so an existing analysis is reused across visitors.
  if (convex) {
    try {
      const hit = await convex.query(fns.icpGetByUrl, { url });
      if (hit) {
        const res = NextResponse.json({
          url,
          business: hit.business,
          sells: hit.sells,
          idealCustomer: hit.idealCustomer,
          keywords: hit.keywords,
          cached: true,
        });
        carrier.cookies.getAll().forEach((c) => res.cookies.set(c));
        // Still attach it to this visitor so their dashboard prefills.
        await convex
          .mutation(fns.icpSave, {
            visitorId,
            url,
            business: hit.business,
            sells: hit.sells,
            idealCustomer: hit.idealCustomer,
            keywords: hit.keywords,
          })
          .catch(() => {});
        return res;
      }
    } catch (err) {
      console.error("[threadly] icp cache read failed:", err);
    }
  }

  const site = await fetchSiteText(url);
  if (!site) {
    return NextResponse.json(
      { error: "Couldn't read that site. Check the address, or enter keywords directly." },
      { status: 422 }
    );
  }

  const icp = await analyseIcp(site.text, url);
  if (!icp) {
    return NextResponse.json(
      { error: "Couldn't analyse that site. Try entering keywords directly." },
      { status: 502 }
    );
  }

  if (convex) {
    try {
      await convex.mutation(fns.icpSave, { visitorId, url, ...icp });
    } catch (err) {
      console.error("[threadly] icp save failed:", err);
    }
  }

  const res = NextResponse.json({ url, ...icp, cached: false });
  carrier.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}
