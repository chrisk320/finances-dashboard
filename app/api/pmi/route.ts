export async function POST(req: Request) {
  const jwt = process.env.PMI_JWT;
  if (!jwt) {
    return Response.json({ error: "missing PMI_JWT" }, { status: 500 });
  }

  try {
    const { agent_id, params, limit = 10, offset = 0 } = await req.json();

    const res = await fetch(
      "https://narrative.agent.heisenberg.so/api/v1/retrieval/parameterized/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ agent_id, params, limit, offset }),
        // Live on-chain feed is intentionally not cached. Other PMI queries
        // get an hour of cache via the Anthropic chat layer downstream.
        cache: "no-store",
      }
    );

    const text = await res.text();
    if (!res.ok) {
      console.error(
        `[/api/pmi] upstream ${res.status} agent=${agent_id}`,
        text.slice(0, 500)
      );
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "non-json upstream", body: text.slice(0, 500) };
    }
    return Response.json(data, { status: res.status });
  } catch (e: any) {
    const message = e?.message ?? "pmi proxy error";
    console.error("[/api/pmi]", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
