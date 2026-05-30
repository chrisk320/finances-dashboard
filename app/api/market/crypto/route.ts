import { LIVE_DATA, type GlobalMarket } from "@/lib/cryptoData";

export const dynamic = "force-dynamic";

const REVALIDATE_S = 300;
const CG = "https://api.coingecko.com/api/v3";

type Mover = { ticker: string; name: string; price: number; changePct: number };
type CoinRow = Mover & { marketCap: number };

type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number | null;
};

async function cg<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${CG}${path}`, {
      next: { revalidate: REVALIDATE_S },
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function toGlobal(raw: {
  data?: {
    total_market_cap?: { usd?: number };
    total_volume?: { usd?: number };
    market_cap_change_percentage_24h_usd?: number;
    market_cap_percentage?: { btc?: number; eth?: number };
    active_cryptocurrencies?: number;
  };
} | null): GlobalMarket | null {
  const d = raw?.data;
  if (!d || typeof d.total_market_cap?.usd !== "number") return null;
  return {
    total_market_cap_usd: d.total_market_cap.usd,
    volume_24h_usd: d.total_volume?.usd ?? 0,
    market_cap_change_24h: d.market_cap_change_percentage_24h_usd ?? 0,
    btc_dominance: d.market_cap_percentage?.btc ?? 0,
    eth_dominance: d.market_cap_percentage?.eth ?? 0,
    active_cryptos: d.active_cryptocurrencies ?? 0,
  };
}

// Seeded snapshot when CoinGecko is unreachable — values are stale but the page
// stays populated instead of empty.
function fallback() {
  const top: CoinRow[] = LIVE_DATA.topCoins.slice(0, 10).map((c) => ({
    ticker: c.symbol.toUpperCase(),
    name: c.name,
    price: c.current_price,
    changePct: c.price_change_percentage_24h,
    marketCap: 0,
  }));
  const toMover = (m: (typeof LIVE_DATA.gainers)[number]): Mover => ({
    ticker: m.symbol.toUpperCase(),
    name: m.name,
    price: m.usd,
    changePct: m.usd_24h_change,
  });
  return {
    global: LIVE_DATA.global,
    top,
    gainers: LIVE_DATA.gainers.slice(0, 6).map(toMover),
    losers: LIVE_DATA.losers.slice(0, 6).map(toMover),
    asOf: Date.now(),
  };
}

export async function GET() {
  const [coins, globalRaw] = await Promise.all([
    cg<MarketCoin[]>(
      "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&price_change_percentage=24h&sparkline=false",
    ),
    cg<Parameters<typeof toGlobal>[0]>("/global"),
  ]);

  if (!Array.isArray(coins) || coins.length === 0) {
    return Response.json(fallback());
  }

  const top: CoinRow[] = coins.slice(0, 10).map((c) => ({
    ticker: c.symbol.toUpperCase(),
    name: c.name,
    price: c.current_price,
    changePct: c.price_change_percentage_24h ?? 0,
    marketCap: c.market_cap ?? 0,
  }));

  const withChange = coins
    .filter((c) => typeof c.price_change_percentage_24h === "number")
    .map<Mover>((c) => ({
      ticker: c.symbol.toUpperCase(),
      name: c.name,
      price: c.current_price,
      changePct: c.price_change_percentage_24h as number,
    }));

  const gainers = withChange
    .filter((m) => m.changePct >= 0)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 6);
  const losers = withChange
    .filter((m) => m.changePct < 0)
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 6);

  return Response.json({
    global: toGlobal(globalRaw) ?? LIVE_DATA.global,
    top,
    gainers,
    losers,
    asOf: Date.now(),
  });
}
