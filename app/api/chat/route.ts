import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("missing ANTHROPIC_API_KEY");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      system,
      messages,
      max_tokens = 1500,
      model = "claude-sonnet-4-20250514",
    } = body;

    if (!Array.isArray(messages)) {
      return Response.json({ error: "messages must be an array" }, { status: 400 });
    }

    const response = await getClient().messages.create({
      model,
      max_tokens,
      system,
      messages,
    });

    return Response.json(response);
  } catch (e: any) {
    const message = e?.message ?? "chat proxy error";
    console.error("[/api/chat]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
