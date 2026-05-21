export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return Response.json({ error: "missing path" }, { status: 400 });
  }

  const url = `https://api.coingecko.com/api/v3${path}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(
        `[/api/coingecko] upstream ${res.status} path=${path}`,
        text.slice(0, 300)
      );
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "non-json upstream", body: text.slice(0, 300) };
    }
    return Response.json(data, { status: res.status });
  } catch (e: any) {
    const message = e?.message ?? "coingecko proxy error";
    console.error("[/api/coingecko]", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
