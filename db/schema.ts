import { pgTable, text, real, bigint, primaryKey } from "drizzle-orm/pg-core";

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    userId: text("user_id").notNull(),
    symbol: text("symbol").notNull(),
    mode: text("mode").notNull(),
    addedAt: bigint("added_at", { mode: "number" }).notNull(),
    lastChecked: bigint("last_checked", { mode: "number" }),
    lastVerdictRating: text("last_verdict_rating"),
    lastVerdictConfidence: text("last_verdict_confidence"),
    lastVerdictSummary: text("last_verdict_summary"),
    lastSeenRating: text("last_seen_rating"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.symbol, t.mode] }),
  }),
);

export const portfolioHoldings = pgTable(
  "portfolio_holdings",
  {
    userId: text("user_id").notNull(),
    ticker: text("ticker").notNull(),
    shares: real("shares").notNull(),
    costBasis: real("cost_basis").notNull(),
    addedAt: bigint("added_at", { mode: "number" }).notNull(),
    notes: text("notes"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.ticker] }),
  }),
);

// Single-row cache for the daily market briefing — survives Vercel cold starts
// so the Claude agent runs at most once per ET day across all instances.
export const marketBriefing = pgTable("market_briefing", {
  id: text("id").primaryKey(), // always "global"
  briefing: text("briefing").notNull(),
  day: text("day").notNull(), // ET date "YYYY-MM-DD"
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
