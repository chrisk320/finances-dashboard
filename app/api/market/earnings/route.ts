import { auth } from "@/lib/auth";
import { MOVERS_UNIVERSE } from "@/lib/marketUniverse";
import { userTickers } from "@/lib/userTickers";

export const dynamic = "force-dynamic";

type EarningsItem = {
  symbol: string;
  name: string;
  date: string; // YYYY-MM-DD
  hour: string; // bmo | amc | dmh | ""
  epsEstimate: number | null;
};
type Scope = "you" | "market";

const REVALIDATE_S = 3600;

const NAME_BY_TICKER = new Map(MOVERS_UNIVERSE.map((s) => [s.ticker, s.name]));

type RawEarning = {
  symbol?: string;
  date?: string;
  hour?: string;
  epsEstimate?: number | null;
};

async function fetchCalendar(key: string): Promise<RawEarning[]> {
  const to = new Date();
  const from = new Date();
  to.setDate(to.getDate() + 7);
  const d = (x: Date) => x.toISOString().slice(0, 10);
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${d(from)}&to=${d(to)}&token=${key}`,
      { next: { revalidate: REVALIDATE_S } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { earningsCalendar?: RawEarning[] };
    return Array.isArray(data.earningsCalendar) ? data.earningsCalendar : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const key = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? process.env.FINNHUB_KEY;
  if (!key) {
    return Response.json({ error: "missing FINNHUB key" }, { status: 500 });
  }

  let scope: Scope = "market";
  let allowed: Set<string> | null = null;

  const session = await auth();
  if (session?.user?.id) {
    const tickers = await userTickers(session.user.id);
    if (tickers.length > 0) {
      scope = "you";
      allowed = new Set(tickers);
    }
  }
  if (!allowed) {
    allowed = new Set(MOVERS_UNIVERSE.map((s) => s.ticker));
  }

  const calendar = await fetchCalendar(key);
  const seen = new Set<string>();
  const items: EarningsItem[] = [];
  for (const e of calendar) {
    const symbol = (e.symbol ?? "").toUpperCase();
    if (!symbol || !e.date || !allowed.has(symbol) || seen.has(symbol)) continue;
    seen.add(symbol);
    items.push({
      symbol,
      name: NAME_BY_TICKER.get(symbol) ?? symbol,
      date: e.date,
      hour: e.hour ?? "",
      epsEstimate: typeof e.epsEstimate === "number" ? e.epsEstimate : null,
    });
  }
  items.sort((a, b) => a.date.localeCompare(b.date));

  return Response.json({ scope, items, asOf: Date.now() });
}
