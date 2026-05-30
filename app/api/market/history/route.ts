import {
  fetchCryptoCloses,
  fetchStockCloses,
  isChartRange,
  type ChartRange,
} from "@/lib/priceHistory";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.trim();
  const mode = searchParams.get("mode") === "crypto" ? "crypto" : "stock";
  const rangeParam = searchParams.get("range");
  const range: ChartRange = isChartRange(rangeParam) ? rangeParam : "6M";

  const empty = { closes: [] as number[], changePct: 0, asOf: Date.now() };
  if (!symbol) return Response.json(empty);

  const closes =
    mode === "crypto"
      ? await fetchCryptoCloses(symbol, range)
      : await fetchStockCloses(encodeURIComponent(symbol), range);

  if (closes.length < 2) return Response.json(empty);

  const first = closes[0];
  const last = closes[closes.length - 1];
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;

  return Response.json({ closes, changePct, asOf: Date.now() });
}
