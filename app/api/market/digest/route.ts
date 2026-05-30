import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { marketDigest } from "@/db/schema";
import { etDay } from "@/lib/marketDay";
import type { MarketDigestItem, NewsImpact } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROW_ID = "global";
const HEADLINE_POOL = 15; // headlines shown to Claude
const MAX_ITEMS = 6; // headlines kept in the digest
const LONG_TERM_SUFFIX =
  " You are writing for someone new to investing with a long-term, buy-and-hold horizon. Filter out short-term noise; explain plainly, no jargon.";

let anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("missing ANTHROPIC_API_KEY");
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

type RawHeadline = {
  headline: string;
  source: string;
  url: string;
  datetime: number;
  related: string;
};

async function fetchHeadlines(): Promise<RawHeadline[]> {
  const key = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? process.env.FINNHUB_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${key}`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      headline?: string;
      source?: string;
      url?: string;
      datetime?: number;
      related?: string;
    }[];
    if (!Array.isArray(data)) return [];
    return data
      .filter((n) => n.headline && n.url)
      .slice(0, HEADLINE_POOL)
      .map((n) => ({
        headline: n.headline!,
        source: n.source ?? "",
        url: n.url!,
        datetime: typeof n.datetime === "number" ? n.datetime : 0,
        related: (n.related ?? "").split(",")[0]?.trim() ?? "",
      }));
  } catch {
    return [];
  }
}

function isImpact(v: unknown): v is NewsImpact {
  return v === "positive" || v === "neutral" || v === "negative";
}

// Ask Claude to pick the most important headlines by index and explain each.
// Returning indices (not rewritten text) keeps urls/sources real.
async function curate(headlines: RawHeadline[]): Promise<MarketDigestItem[]> {
  const system =
    "You are the Markets editor. From a numbered list of today's market headlines, pick the " +
    `up to ${MAX_ITEMS} that matter most for understanding the market today, in priority order. ` +
    'For each, judge its "impact" for a long-term investor (positive, neutral, or negative) and ' +
    'write "whyItMatters": one plain-English sentence under 20 words explaining the significance to a ' +
    "beginner — no jargon, no ticker soup. Respond with a JSON array (and nothing else) of objects " +
    '{ "index": number, "impact": "positive"|"neutral"|"negative", "whyItMatters": string }.' +
    LONG_TERM_SUFFIX;

  const list = headlines.map((h, i) => `${i}. ${h.headline}`).join("\n");
  const user = `Headlines:\n${list}\n\nReturn the JSON array now.`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 900,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text =
    response.content.find((b) => b.type === "text")?.text?.trim() ?? "";
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const items: MarketDigestItem[] = [];
  const used = new Set<number>();
  for (const raw of parsed) {
    const idx = (raw as { index?: unknown })?.index;
    const impact = (raw as { impact?: unknown })?.impact;
    const why = (raw as { whyItMatters?: unknown })?.whyItMatters;
    if (typeof idx !== "number" || !headlines[idx]) continue;
    if (used.has(idx)) continue;
    if (!isImpact(impact)) continue;
    if (typeof why !== "string" || !why.trim()) continue;
    used.add(idx);
    const h = headlines[idx];
    items.push({
      headline: h.headline,
      url: h.url,
      source: h.source,
      datetime: h.datetime,
      related: h.related,
      impact,
      whyItMatters: why.trim(),
    });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

export async function GET() {
  const today = etDay();

  try {
    const [row] = await db
      .select()
      .from(marketDigest)
      .where(eq(marketDigest.id, ROW_ID));

    if (row && row.day === today && row.items) {
      const cached = JSON.parse(row.items) as MarketDigestItem[];
      if (Array.isArray(cached) && cached.length > 0) {
        return Response.json({ items: cached, asOf: row.updatedAt });
      }
    }

    const headlines = await fetchHeadlines();
    if (headlines.length === 0) {
      return Response.json({ items: [], asOf: Date.now() });
    }

    const items = await curate(headlines);
    if (items.length === 0) {
      // Transient failure — don't persist a blank; retry next request.
      return Response.json({ items: [], asOf: Date.now() });
    }

    const asOf = Date.now();
    await db
      .insert(marketDigest)
      .values({ id: ROW_ID, items: JSON.stringify(items), day: today, updatedAt: asOf })
      .onConflictDoUpdate({
        target: marketDigest.id,
        set: { items: JSON.stringify(items), day: today, updatedAt: asOf },
      });

    return Response.json({ items, asOf });
  } catch (e: any) {
    console.error("[/api/market/digest]", e?.message ?? e);
    return Response.json({ items: [], asOf: Date.now() });
  }
}
