import { fetchStockCloses } from "@/lib/priceHistory";

export const dynamic = "force-dynamic";

const WINDOW = 126; // ~6 months of trading days

export async function GET() {
  // FMP/Yahoo via the shared helper. Try the index first, then the SPY ETF.
  let closes = await fetchStockCloses("%5EGSPC", "6M");
  if (closes.length < 2) closes = await fetchStockCloses("SPY", "6M");

  if (closes.length < 2) {
    return Response.json({ closes: [], level: 0, changePct: 0, asOf: Date.now() });
  }

  const windowed = closes.slice(-WINDOW);
  const level = windowed[windowed.length - 1];
  const first = windowed[0];
  const changePct = first > 0 ? ((level - first) / first) * 100 : 0;

  return Response.json({ closes: windowed, level, changePct, asOf: Date.now() });
}
