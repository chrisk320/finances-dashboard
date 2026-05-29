import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { marketBriefing } from "@/db/schema";

export const dynamic = "force-dynamic";

const ROW_ID = "global";
const LONG_TERM_SUFFIX =
  " You are writing for a long-term, buy-and-hold investor with a 3-10 year horizon. Filter out short-term noise; focus on what affects the multi-year picture.";

let anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("missing ANTHROPIC_API_KEY");
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

// Current market day in US/Eastern as YYYY-MM-DD.
function etDay(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

async function fetchHeadlines(): Promise<string[]> {
  const key = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? process.env.FINNHUB_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${key}`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { headline?: string }[];
    return Array.isArray(data)
      ? data
          .map((n) => n.headline)
          .filter((h): h is string => Boolean(h))
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

async function generateBriefing(): Promise<string> {
  const headlines = await fetchHeadlines();
  if (headlines.length === 0) return "";

  const system =
    "You are the Market Researcher agent. Write a tight 3-4 sentence market briefing from today's headlines. Lead with the single most important theme. Be specific and plain-spoken; no preamble, no bullet points, no markdown." +
    LONG_TERM_SUFFIX;
  const user = `Today's market headlines:\n${headlines
    .map((h) => `- ${h}`)
    .join("\n")}\n\nWrite the briefing now.`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: user }],
  });
  return response.content.find((b) => b.type === "text")?.text?.trim() ?? "";
}

export async function GET() {
  const today = etDay();

  try {
    const [row] = await db
      .select()
      .from(marketBriefing)
      .where(eq(marketBriefing.id, ROW_ID));

    if (row && row.day === today && row.briefing) {
      return Response.json({ briefing: row.briefing, asOf: row.updatedAt });
    }

    const briefing = await generateBriefing();
    if (!briefing) {
      // Transient failure — don't persist a blank; retry next request.
      return Response.json({ briefing: "", asOf: Date.now() });
    }

    const asOf = Date.now();
    await db
      .insert(marketBriefing)
      .values({ id: ROW_ID, briefing, day: today, updatedAt: asOf })
      .onConflictDoUpdate({
        target: marketBriefing.id,
        set: { briefing, day: today, updatedAt: asOf },
      });

    return Response.json({ briefing, asOf });
  } catch (e: any) {
    console.error("[/api/market/briefing]", e?.message ?? e);
    return Response.json({ briefing: "", asOf: Date.now() });
  }
}
