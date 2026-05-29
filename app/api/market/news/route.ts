import { SECTOR_NEWS_ETFS } from "@/lib/marketUniverse";

export const dynamic = "force-dynamic";

type Headline = {
  headline: string;
  source: string;
  url: string;
  datetime: number; // unix seconds (Finnhub)
  related: string;
};

type RawNews = {
  headline?: string;
  source?: string;
  url?: string;
  datetime?: number;
  related?: string;
};

const REVALIDATE_S = 600;

function normalize(items: RawNews[], cap: number): Headline[] {
  return items
    .filter((n) => n.headline && n.url)
    .slice(0, cap)
    .map((n) => ({
      headline: n.headline!,
      source: n.source ?? "",
      url: n.url!,
      datetime: typeof n.datetime === "number" ? n.datetime : 0,
      related: (n.related ?? "").split(",")[0]?.trim() ?? "",
    }));
}

async function finnhub(path: string, key: string): Promise<RawNews[]> {
  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`https://finnhub.io/api/v1${path}${sep}token=${key}`, {
      next: { revalidate: REVALIDATE_S },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const key = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? process.env.FINNHUB_KEY;
  if (!key) {
    return Response.json({ error: "missing FINNHUB key" }, { status: 500 });
  }

  const to = new Date();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const d = (x: Date) => x.toISOString().slice(0, 10);

  const [general, ...sectorResults] = await Promise.all([
    finnhub("/news?category=general", key),
    ...SECTOR_NEWS_ETFS.map((s) =>
      finnhub(
        `/company-news?symbol=${s.etf}&from=${d(from)}&to=${d(to)}`,
        key,
      ),
    ),
  ]);

  const sectors = SECTOR_NEWS_ETFS.map((s, i) => ({
    label: s.label,
    etf: s.etf,
    items: normalize(sectorResults[i] ?? [], 5),
  })).filter((s) => s.items.length > 0);

  return Response.json({
    general: normalize(general, 12),
    sectors,
    asOf: Date.now(),
  });
}
