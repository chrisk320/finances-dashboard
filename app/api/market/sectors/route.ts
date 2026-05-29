import { SECTOR_ETFS } from "@/lib/marketUniverse";

export const dynamic = "force-dynamic";

type Sector = { etf: string; label: string; price: number; changePct: number };

const REVALIDATE_S = 300;

async function fetchSector(
  s: { etf: string; label: string },
  key: string,
): Promise<Sector | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
        s.etf,
      )}&token=${key}`,
      { next: { revalidate: REVALIDATE_S } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { c?: number; dp?: number };
    if (typeof data.c !== "number" || data.c <= 0) return null;
    if (typeof data.dp !== "number") return null;
    return { etf: s.etf, label: s.label, price: data.c, changePct: data.dp };
  } catch {
    return null;
  }
}

export async function GET() {
  const key = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? process.env.FINNHUB_KEY;
  if (!key) {
    return Response.json({ error: "missing FINNHUB key" }, { status: 500 });
  }

  const sectors = (
    await Promise.all(SECTOR_ETFS.map((s) => fetchSector(s, key)))
  )
    .filter((s): s is Sector => s !== null)
    .sort((a, b) => b.changePct - a.changePct);

  return Response.json({ sectors, asOf: Date.now() });
}
