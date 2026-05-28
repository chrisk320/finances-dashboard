import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { watchlistItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { AssetMode, Verdict, WatchlistItem } from "@/lib/types";

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function toItem(r: typeof watchlistItems.$inferSelect): WatchlistItem {
  const verdict: Verdict | undefined =
    r.lastVerdictRating && r.lastVerdictConfidence
      ? {
          rating: r.lastVerdictRating as Verdict["rating"],
          confidence: r.lastVerdictConfidence as Verdict["confidence"],
          summary: r.lastVerdictSummary ?? "",
        }
      : undefined;

  return {
    symbol: r.symbol,
    mode: r.mode as AssetMode,
    addedAt: r.addedAt,
    lastChecked: r.lastChecked ?? undefined,
    lastVerdict: verdict,
    lastSeenRating: (r.lastSeenRating as Verdict["rating"]) ?? undefined,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const rows = await db
    .select()
    .from(watchlistItems)
    .where(eq(watchlistItems.userId, session.user.id));
  return Response.json(rows.map(toItem));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;
  const { symbol, mode } = await req.json();
  if (!symbol || !mode) {
    return Response.json({ error: "missing symbol/mode" }, { status: 400 });
  }

  const where = and(
    eq(watchlistItems.userId, userId),
    eq(watchlistItems.symbol, symbol),
    eq(watchlistItems.mode, mode),
  );

  const existing = await db.select().from(watchlistItems).where(where);
  if (existing.length > 0) {
    await db.delete(watchlistItems).where(where);
    return Response.json({ watched: false });
  }
  await db.insert(watchlistItems).values({
    userId,
    symbol,
    mode,
    addedAt: Date.now(),
  });
  return Response.json({ watched: true });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;
  const { symbol, mode, verdict, markSeen } = await req.json();
  if (!symbol || !mode) {
    return Response.json({ error: "missing symbol/mode" }, { status: 400 });
  }

  const where = and(
    eq(watchlistItems.userId, userId),
    eq(watchlistItems.symbol, symbol),
    eq(watchlistItems.mode, mode),
  );

  const [row] = await db.select().from(watchlistItems).where(where);
  if (!row) return Response.json({});

  if (markSeen && row.lastVerdictRating) {
    await db
      .update(watchlistItems)
      .set({ lastSeenRating: row.lastVerdictRating })
      .where(where);
  } else if (verdict) {
    await db
      .update(watchlistItems)
      .set({
        lastVerdictRating: verdict.rating,
        lastVerdictConfidence: verdict.confidence,
        lastVerdictSummary: verdict.summary ?? "",
        lastChecked: Date.now(),
        lastSeenRating: row.lastSeenRating ?? verdict.rating,
      })
      .where(where);
  }
  return Response.json({});
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const { symbol, mode } = await req.json();
  if (!symbol || !mode) {
    return Response.json({ error: "missing symbol/mode" }, { status: 400 });
  }
  await db
    .delete(watchlistItems)
    .where(
      and(
        eq(watchlistItems.userId, session.user.id),
        eq(watchlistItems.symbol, symbol),
        eq(watchlistItems.mode, mode),
      ),
    );
  return Response.json({});
}
