CREATE TABLE "portfolio_holdings" (
	"user_id" text NOT NULL,
	"ticker" text NOT NULL,
	"shares" real NOT NULL,
	"cost_basis" real NOT NULL,
	"added_at" bigint NOT NULL,
	"notes" text,
	CONSTRAINT "portfolio_holdings_user_id_ticker_pk" PRIMARY KEY("user_id","ticker")
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"user_id" text NOT NULL,
	"symbol" text NOT NULL,
	"mode" text NOT NULL,
	"added_at" bigint NOT NULL,
	"last_checked" bigint,
	"last_verdict_rating" text,
	"last_verdict_confidence" text,
	"last_verdict_summary" text,
	"last_seen_rating" text,
	CONSTRAINT "watchlist_items_user_id_symbol_mode_pk" PRIMARY KEY("user_id","symbol","mode")
);
