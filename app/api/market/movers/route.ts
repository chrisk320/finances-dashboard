import { auth } from "@/lib/auth";
import { MOVERS_UNIVERSE } from "@/lib/marketUniverse";
import { userTickers } from "@/lib/userTickers";

export const dynamic = "force-dynamic";

type Mover = {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
};
type Scope = "you" | "market" | "basket";

const QUOTE_REVALIDATE_S = 300;
const PROFILE_REVALIDATE_S = 86400;
const FMP_REVALIDATE_S = 900;

const NAME_BY_TICKER = new Map(
  MOVERS_UNIVERSE.map((s) => [s.ticker, s.name]),
);

function finnhubKey(): string | undefined {
  return process.env.NEXT_PUBLIC_FINNHUB_KEY ?? process.env.FINNHUB_KEY;
}

async function fetchQuote(
  ticker: string,
  key: string,
): Promise<{ price: number; changePct: number } | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
        ticker,
      )}&token=${key}`,
      { next: { revalidate: QUOTE_REVALIDATE_S } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { c?: number; dp?: number };
    if (typeof data.c !== "number" || data.c <= 0) return null;
    if (typeof data.dp !== "number") return null;
    return { price: data.c, changePct: data.dp };
  } catch {
    return null;
  }
}

async function fetchName(ticker: string, key: string): Promise<string> {
  const known = NAME_BY_TICKER.get(ticker);
  if (known) return known;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(
        ticker,
      )}&token=${key}`,
      { next: { revalidate: PROFILE_REVALIDATE_S } },
    );
    if (!res.ok) return ticker;
    const data = (await res.json()) as { name?: string };
    return data.name ?? ticker;
  } catch {
    return ticker;
  }
}

function splitMovers(movers: Mover[]): { gainers: Mover[]; losers: Mover[] } {
  const gainers = movers
    .filter((m) => m.changePct >= 0)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 6);
  const losers = movers
    .filter((m) => m.changePct < 0)
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 6);
  return { gainers, losers };
}

async function quoteTickers(tickers: string[], key: string): Promise<Mover[]> {
  const results = await Promise.all(
    tickers.map(async (ticker) => {
      const [q, name] = await Promise.all([
        fetchQuote(ticker, key),
        fetchName(ticker, key),
      ]);
      if (!q) return null;
      return { ticker, name, price: q.price, changePct: q.changePct };
    }),
  );
  return results.filter((m): m is Mover => m !== null);
}

type FmpItem = {
  symbol?: string;
  name?: string;
  price?: number;
  changesPercentage?: number;
};

async function marketMoversFromFmp(): Promise<{
  gainers: Mover[];
  losers: Mover[];
} | null> {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  const map = (items: FmpItem[]): Mover[] =>
    items
      .filter((i) => i.symbol && typeof i.price === "number")
      .map((i) => ({
        ticker: i.symbol!,
        name: i.name ?? i.symbol!,
        price: i.price!,
        changePct:
          typeof i.changesPercentage === "number" ? i.changesPercentage : 0,
      }));
  try {
    const [g, l] = await Promise.all([
      fetch(
        `https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${key}`,
        { next: { revalidate: FMP_REVALIDATE_S } },
      ),
      fetch(
        `https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=${key}`,
        { next: { revalidate: FMP_REVALIDATE_S } },
      ),
    ]);
    if (!g.ok || !l.ok) return null;
    const gainers = map(await g.json()).slice(0, 6);
    const losers = map(await l.json()).slice(0, 6);
    if (gainers.length === 0 && losers.length === 0) return null;
    return { gainers, losers };
  } catch {
    return null;
  }
}

export async function GET() {
  const key = finnhubKey();
  if (!key) {
    return Response.json({ error: "missing FINNHUB key" }, { status: 500 });
  }

  // Signed-in: highlight the user's own tracked stocks.
  const session = await auth();
  if (session?.user?.id) {
    const tickers = await userTickers(session.user.id);
    if (tickers.length > 0) {
      const movers = await quoteTickers(tickers, key);
      if (movers.length > 0) {
        return Response.json({
          scope: "you" as Scope,
          ...splitMovers(movers),
          asOf: Date.now(),
        });
      }
    }
  }

  // Anonymous (or signed-in but tracking nothing): real market-wide movers.
  const market = await marketMoversFromFmp();
  if (market) {
    return Response.json({
      scope: "market" as Scope,
      gainers: market.gainers,
      losers: market.losers,
      asOf: Date.now(),
    });
  }

  // Fallback: the curated basket.
  const basket = await quoteTickers(
    MOVERS_UNIVERSE.map((s) => s.ticker),
    key,
  );
  return Response.json({
    scope: "basket" as Scope,
    ...splitMovers(basket),
    asOf: Date.now(),
  });
}
