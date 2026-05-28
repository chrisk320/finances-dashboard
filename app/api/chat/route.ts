import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { clientKeyFromHeaders, consume } from "@/lib/rateLimit";

const ANON_MAX = 20;
const ANON_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const USER_MAX = 200;
const USER_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day

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
      const session = await auth();
      const { key, max, windowMs } = session?.user?.id
        ? {
            key: `user:${session.user.id}`,
            max: USER_MAX,
            windowMs: USER_WINDOW_MS,
          }
        : {
            key: `ip:${clientKeyFromHeaders(req.headers)}`,
            max: ANON_MAX,
            windowMs: ANON_WINDOW_MS,
          };
      const limit = consume(key, max, windowMs);
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
