# Financial Research Engine

> Type a ticker. Four AI agents fan out in parallel. Get a long-term buy/hold verdict in under 10 seconds.

[Live demo](https://finances-dashboard-theta.vercel.app) · [Screenshots](#screenshots) · [Architecture](#architecture) · [Tech decisions](#tech-decisions-the-why)

![hero — NVDA result page](docs/screenshots/02-stock-verdict.png)

---

## What it does

A search-driven research engine for a **long-term, buy-and-hold equity investor**. You type a stock ticker (`NVDA`) or crypto symbol (`BTC`) and four specialized agents fire in parallel against live Finnhub, CoinGecko, and Anthropic Claude. The **Intelligence Hub** then synthesizes their outputs into a single `STRONG BUY / BUY / HOLD / AVOID` verdict with a confidence band and a 3–4 sentence thesis.

Beyond the core search loop the app also ships:

- **Markets homepage** — the default landing tab, with a **Stocks / Crypto** toggle:
  - *Stocks:* an AI market briefing (generated at most once per day), a 6-month S&P 500 chart, session-aware movers (your watchlist/portfolio when signed in, real market-wide gainers/losers when signed out), an 11-sector performance heatmap, a session-aware earnings-this-week calendar, and a **"What matters today" AI digest** — the ~6 most important headlines, each tagged Positive / Neutral / Negative with a plain-English "why it matters" for new investors (raw sector headlines collapse below it).
  - *Crypto:* a daily crypto briefing, global market stats (total market cap, 24h volume, BTC/ETH dominance), the top 10 coins by market cap, and 24h gainers/losers.
  - Click any ticker, coin, sector, or headline to jump into research.
- **Live price charts** — every researched stock and crypto shows a price chart with a **1M / 6M / 1Y** range toggle (stocks via Financial Modeling Prep → Yahoo fallback; crypto via CoinGecko).
- **Live-updating price** — the result-page price + today's change poll on an interval (10s stocks / 20s crypto), pausing when the browser tab is hidden; held-position P/L updates with it.
- **Valuation panel** — P/E, EV/EBITDA, FCF margin, ROE, D/E, etc. with color-coded benchmark bands and `?` glossary tooltips
- **News Analyst** — recent company + sector headlines tagged Helps / Mixed / Hurts the long-term thesis
- **Watchlist** — star a ticker, 5-minute background poller flags verdict changes
- **Portfolio** — enter holdings (or paste a CSV) and get **cost-basis-aware** verdicts (the orchestrator bypasses cache for held tickers and feeds your average cost into the Hub prompt)

---

## Screenshots

| | |
|---|---|
| ![search](docs/screenshots/01-search.png) <br/> *Empty search · sidebar + nav* | ![crypto](docs/screenshots/03-crypto.png) <br/> *Crypto verdict with price chart* |
| ![portfolio](docs/screenshots/04-portfolio.png) <br/> *Portfolio · cost-basis-aware verdicts* | ![tooltip](docs/screenshots/07-tooltip.png) <br/> *Glossary tooltip on P/E TTM* |

---

## Architecture

```mermaid
flowchart TD
    User([User types ticker])
    UI[Next.js App Router]
    Cache{4h localStorage<br/>cache hit?}
    Orch[lib/orchestrator.ts<br/>Promise.all fan-out]
    Earn[Earnings Reviewer]
    Mkt[Market Researcher]
    Val[Valuation Reviewer]
    News[News Analyst]
    Hub[Intelligence Hub<br/>synthesizes verdict]
    Verdict[Verdict + Findings]

    User --> UI
    UI --> Cache
    Cache -- yes --> Verdict
    Cache -- no --> Orch
    Orch --> Earn
    Orch --> Mkt
    Orch --> Val
    Orch --> News
    Earn --> Hub
    Mkt --> Hub
    Val --> Hub
    News --> Hub
    Hub --> Verdict

    Earn -.->|/api/chat + /api/finnhub| EXT[(Anthropic Claude<br/>+ Finnhub + CoinGecko)]
    Mkt -.-> EXT
    Val -.-> EXT
    News -.-> EXT
    Hub -.-> EXT
```

**Request flow** — browser hits Next.js Route Handlers (`/api/chat`, `/api/finnhub`, `/api/coingecko`, `/api/pmi`); secrets stay server-side. The orchestrator fans out four agent runners via `Promise.all`, waits for all four, then calls the Hub with a structured context block.

**Three-layer cache** — `next: { revalidate: 3600 }` on the raw API proxies (1h), a 4h `localStorage` cache on the synthesized verdict, and a **Postgres-backed daily cache** for the expensive Markets AI artifacts (the market/crypto briefings and the headline digest). The daily cache keys on the US/Eastern calendar day and survives Vercel serverless cold starts, so those Claude calls run **at most once per day** globally instead of on every cold visit. Held tickers bypass the verdict cache so the Hub sees your live cost basis.

**Cross-tab sync** — `lib/watchlist.ts` and `lib/portfolio.ts` dispatch custom events (`watchlist:change` / `portfolio:change`) on every write so a star toggled in one tab updates the other. A 5-minute watchlist poller pauses on `document.visibilityState` to avoid burning quota in background tabs.

**Live price polling** — `lib/useLivePrice.ts` polls `/api/market/price` on the result page (10s stocks / 20s crypto), seeded from the research snapshot so there's no flash. It pauses when the tab is hidden and refetches immediately on return — same visibility-aware pattern as the watchlist poller.

**Cost protection** — `lib/rateLimit.ts` applies an in-memory sliding-window limit (20 req / IP / hour) to `/api/chat` only. Defends the Anthropic key on a public URL until Phase B introduces per-account quotas tied to Google sign-in.

---

## Tech decisions (the why)

- **Promise.all fan-out beats sequential.** Four agent calls run in ~3s parallel vs ~12s sequential. The Hub waits for all of them, so total latency = max(agent) + Hub round-trip.
- **Two TTLs, not one.** Raw market data (`/quote`, `/company-news`) churns hourly; synthesized verdicts hold up for 4 hours. Mixing them into one TTL wastes Anthropic calls or serves stale prices — separating them gets you the cheap freshness *and* the cheap reuse.
- **Cost-basis-aware verdicts.** When `getHolding(ticker)` returns a position, the orchestrator skips the bare-ticker cache key and injects an explicit "user holds N shares at $X avg" block into the Hub prompt. A "BUY" recommendation reads very differently when you're already 40% up — the model needs to know.
- **Structured agent output.** Each runner appends `STRUCTURED_FORMAT` to its system prompt and the result flows through `parseAgentResponse` which tolerates Claude phrasing drift. UI cards render headline + signal pill + bullets when parsing succeeds, falling back to raw text when it doesn't.
- **Per-user persistence behind Google sign-in.** Watchlist + portfolio are server-backed in Neon Postgres (Drizzle ORM), gated by NextAuth + Google. Search and verdict stay fully public so anon recruiters can demo end-to-end. A one-time client-side migrator imports any pre-existing localStorage data on first sign-in, so power users don't lose their earlier state.
- **Session-aware rate limit on `/api/chat`.** Anon users get an IP-keyed sliding window (20/hour); signed-in users get a generous per-account daily quota (200/day). Same `lib/rateLimit.ts` helper, different key prefixes.
- **Polling, not WebSockets, for live prices.** The app runs on Vercel serverless — there's no always-on process to host a WebSocket server or hold upstream socket connections, Finnhub's WS would expose the proxied API key, and CoinGecko has no free WS. For a long-term research tool a ~10–20s polled refresh is indistinguishable from streaming, so polling wins on simplicity and cost. (Binance's free public WS is the clean future path for tick-level crypto.)
- **Daily AI artifacts in Postgres, not an in-memory cache.** The market/crypto briefings and headline digest are expensive Claude calls that should run ~once a day. A module-level cache only helps while a serverless instance stays warm — on sparse traffic Vercel cold-starts between visits, so it would regenerate far too often. Persisting them in the existing Neon DB (keyed on the ET day) makes "once per day" hold across cold starts and instances.

---

## Tech stack

**Next.js 14** (App Router) · **TypeScript** strict · **Tailwind CSS** · **Anthropic Claude** (Sonnet 4) · **Finnhub** · **CoinGecko** · **NextAuth v5** (Google) · **Neon Postgres** · **Drizzle ORM** · **Vercel**

No external state library. No tooltip / popover library. No Redux, no Zustand. Just `useState` / `useEffect`, server-fetched per-user state, and a couple of `CustomEvent`s for cross-tab sync.

---

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in the three keys
npm run dev                        # http://localhost:3000
```

### Required env vars

| Key | Used by | How to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | All Claude calls (agent runners, Intelligence Hub) | console.anthropic.com |
| `NEXT_PUBLIC_FINNHUB_KEY` | Stock quotes, company news, earnings, fundamentals | finnhub.io/dashboard |
| `AUTH_SECRET` | NextAuth JWT signing | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth for watchlist + portfolio sign-in | console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client ID (Web) |
| `DATABASE_URL` | Neon Postgres for per-user watchlist + portfolio | Vercel dashboard → Storage → Create Neon → connect to project; pull locally with `npx vercel env pull .env.local` |
| `FMP_API_KEY` | Markets homepage: signed-out "real market movers" + the S&P 500 chart (optional — movers fall back to the curated basket, chart falls back to Yahoo) | financialmodelingprep.com (free key) |
| `PMI_JWT` | Heisenberg prediction markets (idle / manual only — optional) | narrative.agent.heisenberg.so → DevTools → Network → `Authorization` header. **Expires periodically.** |

`.env.local` is gitignored. Never put real keys in `.env.local.example`.

### Database migrations (Drizzle)

```bash
npx drizzle-kit generate    # produces SQL in db/migrations/
npx drizzle-kit push        # applies schema to DATABASE_URL
```

### Project layout

```
app/
├── layout.tsx
├── page.tsx                    # Renders <ResearchEngine />
└── api/
    ├── chat/route.ts           # Anthropic proxy + session-aware rate limit
    ├── finnhub/route.ts        # Finnhub proxy (revalidate: 3600, no-store on /quote)
    ├── coingecko/route.ts      # CoinGecko proxy (revalidate: 3600)
    ├── pmi/route.ts            # Heisenberg PMI proxy (no cache)
    ├── auth/[...nextauth]/     # NextAuth v5 (Google)
    ├── watchlist/ · portfolio/ # Per-user data (Neon Postgres via Drizzle)
    ├── migrate/route.ts        # One-time localStorage → DB import on first sign-in
    └── market/                 # Markets homepage + live data
        ├── briefing/route.ts   #   AI briefing (?kind=stocks|crypto) — daily DB cache
        ├── digest/route.ts     #   "What matters today" headline digest — daily DB cache
        ├── crypto/route.ts     #   Global stats + top-10 + movers (CoinGecko)
        ├── price/route.ts      #   Live price poll (Finnhub / CoinGecko)
        ├── history/route.ts    #   Chart closes 1M/6M/1Y (FMP→Yahoo / CoinGecko)
        ├── sp500/route.ts      #   6-month S&P 500 line
        ├── movers/ · sectors/ · earnings/ · news/   # session-aware market sections

lib/
├── orchestrator.ts             # runStockResearch / runCryptoResearch · Promise.all fan-out · 4h localStorage cache
├── agents.ts                   # AGENTS[] + AUTO_AGENT slug sets
├── auth.ts                     # NextAuth v5 config (Google, JWT sessions)
├── priceHistory.ts             # Shared chart-close fetchers (stock FMP→Yahoo, crypto CoinGecko)
├── useLivePrice.ts             # Visibility-aware price polling hook
├── marketDay.ts                # ET calendar day — daily-cache key
├── marketUniverse.ts           # Curated mega-cap basket + sector ETFs
├── userTickers.ts              # Union of a user's watchlist + portfolio tickers
├── cryptoData.ts               # Seeded CoinGecko snapshot (fallback)
├── rateLimit.ts                # In-memory sliding-window limiter
├── watchlist.ts                # CRUD + verdict-change detection
├── portfolio.ts                # CRUD + CSV parser + cost-basis lookup
├── metricsGlossary.ts          # Metric definitions + benchmark bands
├── verdictStyle.ts · format.ts · types.ts

db/                             # Drizzle ORM + Neon Postgres
├── client.ts                   # neon() client (no-store fetch) + lazy init
├── schema.ts                   # watchlist · portfolio · market_briefing · market_digest
└── migrations/

components/
├── ResearchEngine.tsx          # Root: nav + sidebar + result + watchlist poller
├── MarketOverview.tsx          # Markets tab: Stocks/Crypto toggle + all sections
├── MarketDigest.tsx · CryptoStats.tsx · CoinList.tsx   # Markets sub-components
├── PriceChart.tsx · LineChart.tsx                      # Range-toggle chart + SVG line
├── SearchSidebar.tsx
├── ResultPage.tsx              # Live price + verdict + valuation + news + findings
├── VerdictCard.tsx
├── ValuationPanel.tsx          # P/E etc. tiles with color-coded bands
├── MetricTooltip.tsx           # `?` button + popover
├── NewsEventsPanel.tsx         # Helps / Mixed / Hurts tags grouped by scope
├── PortfolioView.tsx           # Manual entry + CSV paste + holdings table
├── PositionPanel.tsx           # Cost-basis P/L on result page when held
├── WatchlistSection.tsx · AgentFindingCard.tsx · AgentStatusList.tsx
└── ...
```

### Common tasks

| | |
|---|---|
| Add an agent that runs automatically | Add it to `AGENTS` in `lib/agents.ts`, add slug to `STOCK_AUTO_AGENTS`, add a runner in `lib/orchestrator.ts`, fold it into the `Promise.all` |
| Add a manual-only agent | Add to `AGENTS` only — it appears as a `+ Run` button on the result page |
| Refresh a stale verdict | Click `↺ Refresh` on the result page (clears the cache key for that ticker) |
| Rotate the PMI JWT | Paste a fresh value in `.env.local` and restart `npm run dev` |

---

## What's next

- **Tests + CI** — Vitest unit on `parseAgentResponse` / `parseNewsEventsResponse` / verdict regex / cache helpers, Playwright e2e on search → verdict, GitHub Actions for typecheck/lint/test/build on every push
- **Server-side cron** — Vercel Cron re-runs research on every signed-in user's watchlist daily; surfaces verdict changes via email digest
- **Streaming Claude responses** — SSE on `/api/chat` so finding cards materialize token-by-token
- **Sentry + structured logging**
- **Schwab OAuth** — replace manual portfolio entry with real brokerage sync

See [CLAUDE.md](CLAUDE.md) for the full design spec.
