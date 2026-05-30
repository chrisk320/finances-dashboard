export const dynamic = "force-dynamic";

const CG = "https://api.coingecko.com/api/v3";

type PriceResult = { price: number; changePct: number; asOf: number };

const empty = (): PriceResult => ({ price: 0, changePct: 0, asOf: Date.now() });

async function stockPrice(symbol: string): Promise<PriceResult> {
  const key = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? process.env.FINNHUB_KEY;
  if (!key) return empty();
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
      { cache: "no-store" },
    );
    if (!res.ok) return empty();
    const d = (await res.json()) as { c?: number; dp?: number };
    return { price: d.c ?? 0, changePct: d.dp ?? 0, asOf: Date.now() };
  } catch {
    return empty();
  }
}

async function cryptoPrice(symbol: string): Promise<PriceResult> {
  const s = symbol.toLowerCase();
  try {
    // Resolve symbol -> CoinGecko id. Cached an hour so repeated polls don't
    // re-hit search; the resolution is stable.
    const searchRes = await fetch(
      `${CG}/search?query=${encodeURIComponent(s)}`,
      { next: { revalidate: 3600 }, headers: { accept: "application/json" } },
    );
    if (!searchRes.ok) return empty();
    const search = (await searchRes.json()) as {
      coins?: { id: string; symbol: string }[];
    };
    const match =
      search.coins?.find((c) => c.symbol.toLowerCase() === s) ??
      search.coins?.[0];
    if (!match) return empty();

    const priceRes = await fetch(
      `${CG}/simple/price?ids=${encodeURIComponent(
        match.id,
      )}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 20 }, headers: { accept: "application/json" } },
    );
    if (!priceRes.ok) return empty();
    const data = (await priceRes.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number }
    >;
    const row = data[match.id];
    if (!row || typeof row.usd !== "number") return empty();
    return {
      price: row.usd,
      changePct: row.usd_24h_change ?? 0,
      asOf: Date.now(),
    };
  } catch {
    return empty();
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.trim();
  const mode = searchParams.get("mode") === "crypto" ? "crypto" : "stock";
  if (!symbol) return Response.json(empty());

  const result =
    mode === "crypto" ? await cryptoPrice(symbol) : await stockPrice(symbol);
  return Response.json(result);
}
