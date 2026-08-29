/**
 * Gemini helpers. Both functions fail soft and return null — the caller keeps
 * its existing behaviour (raw keywords, regex scoring) if the API is missing,
 * slow, or returns something unexpected. Gemini improves Threadly; it is never
 * allowed to break a search.
 */

// gemini-2.5-flash 404s for new API keys; 3.x is the current line. Gemini 3
// models also reject thinkingConfig, so thinking is left at its default.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export function geminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

type GenConfig = {
  responseSchema: Record<string, unknown>;
  temperature?: number;
  timeoutMs?: number;
};

async function generateJson<T>(prompt: string, cfg: GenConfig): Promise<T | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: cfg.responseSchema,
          temperature: cfg.temperature ?? 0.2,
        },
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs ?? 30_000),
    });

    if (!res.ok) {
      console.error("[threadly] gemini HTTP", res.status, (await res.text()).slice(0, 200));
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("[threadly] gemini call failed:", err);
    return null;
  }
}

/**
 * Turns however the user phrased it into the phrasings buyers actually post.
 * The Threads actor is very literal: "design services" returns nothing while
 * "looking for a web designer" returns a full page.
 */
export async function expandKeywords(raw: string): Promise<string[] | null> {
  const out = await generateJson<{ queries: string[] }>(
    `You generate search queries for Meta Threads to find people who want to HIRE or BUY.

The user is selling: "${raw}"

Threads matches text almost literally, so SHORT queries find far more posts than
specific ones. "looking for a video editor" finds many; "looking for a good
freelance video editor now" finds almost none.

Write 3 search queries:
- 3 to 5 words each. Shorter is always better.
- NO adjectives (good, great, affordable, freelance, experienced) and NO time
  words (now, asap, urgently). They cut the number of matches to near zero.
- Use the plainest noun for the role: "video editor", "web designer", "bookkeeper".
- Vary only the opening verb across the three: "looking for", "need", "anyone know".
- Phrase them as someone SEEKING the service, never offering it.
- No hashtags, quotes or punctuation.

Example for "web design":
looking for a web designer / need a web designer / anyone know a web designer`,
    {
      responseSchema: {
        type: "object",
        properties: {
          queries: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
        },
        required: ["queries"],
      },
      temperature: 0.4,
      timeoutMs: 25_000,
    }
  );

  const queries = out?.queries?.map((q) => q.trim()).filter(Boolean);
  return queries?.length ? queries.slice(0, 3) : null;
}

export type GeminiVerdict = {
  postId: string;
  score: number;
  isSeller: boolean;
  signals: string[];
};

/**
 * Scores real buying intent. The regex scorer cannot tell a buyer from a seller —
 * "Need a Graphic Designer? Fast turnaround" is an advert, but it matches every
 * intent phrase. Gemini reads it as an advert and drops it.
 */
export async function scoreIntent(
  posts: { postId: string; username: string; text: string }[]
): Promise<Map<string, GeminiVerdict> | null> {
  if (!posts.length) return null;

  const payload = posts.slice(0, 30).map((p) => ({
    postId: p.postId,
    text: p.text.slice(0, 700),
  }));

  const out = await generateJson<{ verdicts: GeminiVerdict[] }>(
    `You score Meta Threads posts as sales leads for a freelancer or agency.

For each post return:
- score 0-100: how strongly this person wants to HIRE or BUY right now.
    90-100 = explicitly hiring, budget or urgency stated
    70-89  = clearly asking for a recommendation or provider
    40-69  = a want or problem, but vague or not urgent
    1-39   = barely relevant
    0      = not a buyer at all
- isSeller true if the author is ADVERTISING their own services, showcasing work,
  posting a portfolio, or recruiting clients. These are competitors, not leads.
  An advert phrased as a question ("Need a designer? I can help!") is still a seller.
- signals: up to 4 very short tags, e.g. "Hiring", "Budget stated", "Urgent",
  "Asking for recs", "Business owner".

Return one entry per post, echoing postId exactly.

POSTS:
${JSON.stringify(payload)}`,
    {
      responseSchema: {
        type: "object",
        properties: {
          verdicts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                postId: { type: "string" },
                score: { type: "integer" },
                isSeller: { type: "boolean" },
                signals: { type: "array", items: { type: "string" } },
              },
              required: ["postId", "score", "isSeller", "signals"],
            },
          },
        },
        required: ["verdicts"],
      },
      temperature: 0.1,
      timeoutMs: 60_000,
    }
  );

  if (!out?.verdicts?.length) return null;

  const map = new Map<string, GeminiVerdict>();
  for (const v of out.verdicts) {
    if (typeof v?.postId !== "string") continue;
    map.set(v.postId, {
      postId: v.postId,
      score: Math.max(0, Math.min(100, Math.round(Number(v.score) || 0))),
      isSeller: Boolean(v.isSeller),
      signals: Array.isArray(v.signals) ? v.signals.slice(0, 4).map(String) : [],
    });
  }
  return map.size ? map : null;
}
