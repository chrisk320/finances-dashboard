// Server-only helpers for historical price closes, shared by the per-asset
// chart route (/api/market/history) and the S&P 500 card route (/api/market/sp500).
// Stocks: FMP (optional key) -> Yahoo no-key fallback. Crypto: CoinGecko market_chart.

export type ChartRange = "1M" | "6M" | "1Y";

type RangeSpec = { yahoo: string; fmpDays: number; cgDays: number };

export const RANGES: Record<ChartRange, RangeSpec> = {
  "1M": { yahoo: "1mo", fmpDays: 22, cgDays: 30 },
  "6M": { yahoo: "6mo", fmpDays: 126, cgDays: 180 },
  "1Y": { yahoo: "1y", fmpDays: 252, cgDays: 365 },
};

export function isChartRange(v: string | null): v is ChartRange {
  return v === "1M" || v === "6M" || v === "1Y";
}

const REVALIDATE_S = 3600; // daily data; 1h cache is plenty

async function fromFmp(symbol: string, days: number): Promise<number[]> {
  const key = process.env.FMP_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&timeseries=${days}&apikey=${key}`,
      { next: { revalidate: REVALIDATE_S } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { historical?: { close?: number }[] };
    const hist = data.historical ?? [];
    if (hist.length < 2) return [];
    // FMP returns newest-first — reverse to chronological.
    return hist
      .map((h) => h.close)
      .filter((c): c is number => typeof c === "number" && c > 0)
      .reverse();
  } catch {
    return [];
  }
}

// Yahoo's chart API works for any ticker. Works in local dev; may be blocked
// from datacenter IPs (Vercel), in which case the caller shows "unavailable".
async function fromYahoo(symbol: string, range: string): Promise<number[]> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=1d`,
      { next: { revalidate: REVALIDATE_S } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      chart?: {
        result?: { indicators?: { quote?: { close?: (number | null)[] }[] } }[];
      };
    };
    const raw = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return raw.filter((c): c is number => typeof c === "number" && c > 0);
  } catch {
    return [];
  }
}

// Historical closes for a stock/index/ETF symbol. `symbol` should already be
// URL-safe (e.g. "%5EGSPC" for ^GSPC). FMP first, Yahoo fallback.
export async function fetchStockCloses(
  symbol: string,
  range: ChartRange,
): Promise<number[]> {
  const spec = RANGES[range];
  let closes = await fromFmp(symbol, spec.fmpDays);
  if (closes.length < 2) closes = await fromYahoo(symbol, spec.yahoo);
  return closes;
}

// Historical closes for a crypto symbol. Resolves symbol -> CoinGecko id, then
// pulls market_chart. Mirrors fetchCoinGeckoCoin's resolution in orchestrator.ts.
export async function fetchCryptoCloses(
  symbol: string,
  range: ChartRange,
): Promise<number[]> {
  const s = symbol.toLowerCase();
  try {
    const searchRes = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(s)}`,
      { next: { revalidate: REVALIDATE_S } },
    );
    if (!searchRes.ok) return [];
    const search = (await searchRes.json()) as {
      coins?: { id: string; symbol: string }[];
    };
    const match =
      search.coins?.find((c) => c.symbol.toLowerCase() === s) ??
      search.coins?.[0];
    if (!match) return [];

    const chartRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
        match.id,
      )}/market_chart?vs_currency=usd&days=${RANGES[range].cgDays}`,
      { next: { revalidate: REVALIDATE_S } },
    );
    if (!chartRes.ok) return [];
    const data = (await chartRes.json()) as { prices?: [number, number][] };
    return (data.prices ?? [])
      .map(([, price]) => price)
      .filter((c): c is number => typeof c === "number" && c > 0);
  } catch {
    return [];
  }
}
