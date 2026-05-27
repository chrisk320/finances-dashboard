import Anthropic from "@anthropic-ai/sdk";
import { clientKeyFromHeaders, consume } from "@/lib/rateLimit";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
    if (process.env.NODE_ENV === "production") {
      const key = clientKeyFromHeaders(req.headers);
      const limit = consume(key, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
      if (!limit.ok) {
        return Response.json(
          {
            error: "Too many requests. Please wait before searching again.",
            retryAfterMs: limit.retryAfterMs,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
            },
          },
        );
      }
    }

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
