import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { portfolioHoldings, watchlistItems } from "@/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const body = await req.json();

  let watchlistImported = 0;
  let portfolioImported = 0;

  if (Array.isArray(body.watchlist)) {
    for (const i of body.watchlist) {
      if (!i?.symbol || !i?.mode) continue;
      await db
        .insert(watchlistItems)
        .values({
          userId,
          symbol: String(i.symbol),
          mode: String(i.mode),
          addedAt: typeof i.addedAt === "number" ? i.addedAt : Date.now(),
          lastChecked: typeof i.lastChecked === "number" ? i.lastChecked : null,
          lastVerdictRating: i.lastVerdict?.rating ?? null,
          lastVerdictConfidence: i.lastVerdict?.confidence ?? null,
          lastVerdictSummary: i.lastVerdict?.summary ?? null,
          lastSeenRating: i.lastSeenRating ?? null,
        })
        .onConflictDoNothing();
      watchlistImported += 1;
    }
  }

  if (Array.isArray(body.portfolio)) {
    for (const h of body.portfolio) {
      const ticker = String(h?.ticker ?? "").toUpperCase().trim();
      const shares = Number(h?.shares);
      const costBasis = Number(h?.costBasis);
      if (!ticker || !Number.isFinite(shares) || shares <= 0) continue;
      if (!Number.isFinite(costBasis) || costBasis <= 0) continue;
      await db
        .insert(portfolioHoldings)
        .values({
          userId,
          ticker,
          shares,
          costBasis,
          addedAt: typeof h.addedAt === "number" ? h.addedAt : Date.now(),
          notes: h.notes ? String(h.notes) : null,
        })
        .onConflictDoUpdate({
          target: [portfolioHoldings.userId, portfolioHoldings.ticker],
          set: { shares, costBasis, notes: h.notes ? String(h.notes) : null },
        });
      portfolioImported += 1;
    }
  }

  return Response.json({ watchlistImported, portfolioImported });
}
