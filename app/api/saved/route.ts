import { NextResponse } from "next/server";
import { ensureVisitorId } from "@/lib/entitlement";
import { resolveIdentity } from "@/lib/identity";
import { getConvex, fns, type SavedStatus } from "@/lib/convex";

const STATUSES: SavedStatus[] = ["new", "contacted", "replied", "won", "dead"];

function unavailable() {
  return NextResponse.json(
    { error: "Saved leads need Convex configured.", code: "convex_not_configured" },
    { status: 503 }
  );
}

export async function GET() {
  const convex = getConvex();
  if (!convex) return NextResponse.json({ leads: [], available: false });

  const { key: visitorId } = await resolveIdentity();
  if (!visitorId) return NextResponse.json({ leads: [], available: true });

  try {
    const leads = await convex.query(fns.savedList, { visitorId });
    return NextResponse.json({ leads, available: true });
  } catch (err) {
    console.error("[threadly] saved list failed:", err);
    return NextResponse.json({ leads: [], available: true });
  }
}

export async function POST(req: Request) {
  const convex = getConvex();
  if (!convex) return unavailable();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  const identity = await resolveIdentity();
  // Signed-in users key off the account; anonymous ones mint a visitor cookie.
  const visitorId = identity.authed ? identity.key : await ensureVisitorId(res);
  const postId = String(body.postId || "");
  if (!postId) return NextResponse.json({ error: "postId is required." }, { status: 400 });

  try {
    const action = String(body.action || "save");

    if (action === "save") {
      await convex.mutation(fns.savedSave, {
        visitorId,
        postId,
        username: String(body.username || ""),
        fullName: body.fullName ? String(body.fullName) : undefined,
        text: String(body.text || ""),
        url: String(body.url || ""),
        profileUrl: String(body.profileUrl || ""),
        score: Number(body.score || 0),
        postedAt: String(body.postedAt || ""),
      });
    } else if (action === "status") {
      const status = String(body.status || "") as SavedStatus;
      if (!STATUSES.includes(status)) {
        return NextResponse.json({ error: "Unknown status." }, { status: 400 });
      }
      await convex.mutation(fns.savedSetStatus, { visitorId, postId, status });
    } else if (action === "notes") {
      await convex.mutation(fns.savedSetNotes, {
        visitorId,
        postId,
        notes: String(body.notes || ""),
      });
    } else if (action === "remove") {
      await convex.mutation(fns.savedRemove, { visitorId, postId });
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    return res;
  } catch (err) {
    console.error("[threadly] saved mutation failed:", err);
    return NextResponse.json({ error: "Could not update saved lead." }, { status: 502 });
  }
}
