import { NextResponse } from "next/server";
import { stripeConfigured, stripeRequest } from "@/lib/stripe";

const PRICE_CENTS = 2000;

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not connected yet. Set STRIPE_SECRET_KEY to enable checkout.",
        code: "stripe_not_configured",
      },
      { status: 503 }
    );
  }

  const origin = new URL(req.url).origin;

  try {
    const session = await stripeRequest("checkout/sessions", {
      method: "POST",
      form: {
        mode: "payment",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": String(PRICE_CENTS),
        "line_items[0][price_data][product_data][name]": "Threadly Lifetime",
        "line_items[0][price_data][product_data][description]":
          "Unlimited Threads lead searches, forever. One-time payment.",
        success_url: `${origin}/api/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout=cancelled`,
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start checkout." },
      { status: 502 }
    );
  }
}
