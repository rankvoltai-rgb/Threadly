/**
 * Fetches a prospect's own website and turns it into an ICP: what they sell,
 * who buys it, and the Threads queries that find those buyers.
 */

const MAX_BYTES = 400_000;

/** Blocks SSRF: only public http(s) hosts, never loopback or private ranges. */
export function normaliseUrl(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return null;
  }
  // A bare hostname with no dot is almost always an internal name.
  if (!host.includes(".")) return null;

  return url.toString();
}

/** Pulls the readable copy out of a page — title, meta description and body text. */
export async function fetchSiteText(url: string): Promise<{ text: string; title: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ThreadlyBot/1.0; +https://threadly-bs61.onrender.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html") && !type.includes("text")) return null;

    const raw = (await res.text()).slice(0, MAX_BYTES);

    const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const description =
      raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "";
    const ogDescription =
      raw.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "";

    const body = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    const text = [title, description, ogDescription, body]
      .filter(Boolean)
      .join("\n")
      .slice(0, 6000);

    return text.length < 40 ? null : { text, title };
  } catch (err) {
    console.error("[threadly] site fetch failed:", err);
    return null;
  }
}
