/**
 * Thin Stripe REST client. Talks to the API directly with a plain secret key, so
 * it works with any Stripe account and there is no SDK version to keep in step.
 */
export function stripeKey() {
  return (
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_RESTRICTED_KEY ||
    ""
  );
}

export function stripeConfigured() {
  return stripeKey().startsWith("sk_") || stripeKey().startsWith("rk_");
}

export async function stripeRequest(
  path: string,
  init: { method: "GET" | "POST"; form?: Record<string, string> }
) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: init.form ? new URLSearchParams(init.form).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  }
  return json;
}
