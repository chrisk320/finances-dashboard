import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { portfolioHoldings, watchlistItems } from "@/db/schema";

/** Union of a user's watched stock symbols + portfolio tickers (uppercased). */
export async function userTickers(userId: string): Promise<string[]> {
  const [watch, holdings] = await Promise.all([
    db
      .select({ symbol: watchlistItems.symbol })
      .from(watchlistItems)
      .where(
        and(
          eq(watchlistItems.userId, userId),
          eq(watchlistItems.mode, "stocks"),
        ),
      ),
    db
      .select({ ticker: portfolioHoldings.ticker })
      .from(portfolioHoldings)
      .where(eq(portfolioHoldings.userId, userId)),
  ]);
  const set = new Set<string>();
  for (const w of watch) set.add(w.symbol.toUpperCase());
  for (const h of holdings) set.add(h.ticker.toUpperCase());
  return [...set];
}
