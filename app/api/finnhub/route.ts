export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const key = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? process.env.FINNHUB_KEY;

  if (!path) {
    return Response.json({ error: "missing path" }, { status: 400 });
  }
  if (!key) {
    return Response.json({ error: "missing FINNHUB key" }, { status: 500 });
  }

  const separator = path.includes("?") ? "&" : "?";
  const url = `https://finnhub.io/api/v1${path}${separator}token=${key}`;

  // Quotes change minute-to-minute — never cache. Other endpoints (news,
  // earnings calendar) are stable enough to hold for an hour.
  const isQuote = path.startsWith("/quote");
  const fetchInit: RequestInit = isQuote
    ? { cache: "no-store" }
    : { next: { revalidate: 3600 } };

  try {
    const res = await fetch(url, fetchInit);
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e: any) {
    const message = e?.message ?? "finnhub proxy error";
    console.error("[/api/finnhub]", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
