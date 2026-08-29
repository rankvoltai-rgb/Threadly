import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const FREE_LEAD_LIMIT = 10;
export const LICENSE_COOKIE = "threadly_license";
export const TRIAL_COOKIE = "threadly_trial_used";

function secret() {
  return process.env.LICENSE_SECRET || "threadly-insecure-dev-secret";
}

/** Signed, self-contained license token. No user table, no auth — just proof of purchase. */
export function signLicense(reference: string) {
  const payload = `lifetime:${reference}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyLicense(token: string | undefined | null): boolean {
  if (!token || !token.includes(".")) return false;
  const [encoded, sig] = token.split(".");
  try {
    const payload = Buffer.from(encoded, "base64url").toString();
    if (!payload.startsWith("lifetime:")) return false;
    const expected = createHmac("sha256", secret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function getEntitlement() {
  const jar = await cookies();
  const licensed = verifyLicense(jar.get(LICENSE_COOKIE)?.value);
  const used = Number(jar.get(TRIAL_COOKIE)?.value || 0);
  const trialUsed = Number.isFinite(used) ? Math.max(0, used) : 0;
  return {
    licensed,
    trialUsed,
    trialRemaining: licensed ? Infinity : Math.max(0, FREE_LEAD_LIMIT - trialUsed),
  };
}
