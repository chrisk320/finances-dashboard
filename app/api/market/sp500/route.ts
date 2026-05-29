export const dynamic = "force-dynamic";

const WINDOW = 126; // ~6 months of trading days
const REVALIDATE_S = 3600; // daily data; 1h cache is plenty

// Primary: Financial Modeling Prep (reuses the optional FMP_API_KEY; reliable
// from Vercel's servers). Falls back to the SPY ETF if the index isn't covered.
async function fromFmp(): Promise<number[]> {
  const key = process.env.FMP_API_KEY;
  if (!key) return [];
  for (const symbol of ["%5EGSPC", "SPY"]) {
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&timeseries=${WINDOW}&apikey=${key}`,
        { next: { revalidate: REVALIDATE_S } },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        historical?: { close?: number }[];
      };
      const hist = data.historical ?? [];
      if (hist.length < 2) continue;
      // FMP returns newest-first — reverse to chronological.
      const closes = hist
        .map((h) => h.close)
        .filter((c): c is number => typeof c === "number" && c > 0)
        .reverse();
      if (closes.length >= 2) return closes;
    } catch {
      // try next symbol
    }
  }
  return [];
}

// No-key fallback: Yahoo's chart API. Works in local dev; may be blocked from
// datacenter IPs (Vercel), in which case the card shows "unavailable".
async function fromYahoo(): Promise<number[]> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=6mo&interval=1d",
      { next: { revalidate: REVALIDATE_S } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      chart?: {
        result?: { indicators?: { quote?: { close?: (number | null)[] }[] } }[];
      };
    };
    const raw =
      data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return raw.filter((c): c is number => typeof c === "number" && c > 0);
  } catch {
    return [];
  }
}

export async function GET() {
  let closes = await fromFmp();
  if (closes.length < 2) closes = await fromYahoo();
  if (closes.length < 2) {
    return Response.json({ closes: [], level: 0, changePct: 0, asOf: Date.now() });
  }

  const windowed = closes.slice(-WINDOW);
  const level = windowed[windowed.length - 1];
  const first = windowed[0];
  const changePct = first > 0 ? ((level - first) / first) * 100 : 0;

  return Response.json({ closes: windowed, level, changePct, asOf: Date.now() });
}
