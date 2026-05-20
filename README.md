# Financial Research Engine

A search-driven research engine for a long-term, buy-and-hold equity investor. Type a ticker (`NVDA`) or crypto symbol (`SOL`) and specialized agents fan out in parallel — pulling earnings, news, prediction-market signals, and crypto data — then the **Intelligence Hub** synthesizes everything into a single `STRONG BUY / BUY / HOLD / AVOID` verdict with a 3-4 sentence thesis.

It is not a dashboard of agents. It is a search engine where agents are the backend workers.

---

## Quick start

```bash
npm install
cp .env.local.example .env.local   # then fill in the three keys
npm run dev                        # http://localhost:3000
```

### Required env vars

| Key | Where it's used | How to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | All Claude calls (agent runners, Intelligence Hub) | console.anthropic.com |
| `PMI_JWT` | Heisenberg prediction-market queries | narrative.agent.heisenberg.so → DevTools → Network → `Authorization` header. **Expires periodically — paste a fresh one when calls 401.** |
| `NEXT_PUBLIC_FINNHUB_KEY` | Stock quotes, company news, earnings calendar | finnhub.io/dashboard |

`.env.local` is gitignored. Never put real keys in `.env.local.example`.

---

## How a search works

```
User types "NVDA"
  → 3 agents fire in parallel via lib/orchestrator.ts
      ✓ Earnings Reviewer    — Finnhub company news + Claude synthesis
      ✓ Market Researcher    — recent headlines + sector read
      ✓ Prediction Markets   — Heisenberg PMI agent 575 (spiking markets)
  → Intelligence Hub waits for all three, then produces the verdict
  → Result page renders:
      - Live price + today's change (Finnhub /quote)
      - Verdict card (rating + confidence + thesis)
      - One card per agent that ran
      - Idle agents shown as "+ Run" buttons
```

Same flow for crypto (`SOL`), except the per-asset agent is **Crypto Intelligence** reading the seeded CoinGecko snapshot.

Every agent system prompt is suffixed with the long-term investor profile:

> You are analyzing this for a long-term, buy-and-hold investor with a 3-10 year horizon. Filter out short-term noise. Focus on what affects the multi-year thesis. Be direct.

---

## Project structure

```
app/
├── layout.tsx
├── page.tsx                    # Renders <ResearchEngine />
└── api/
    ├── chat/route.ts           # Anthropic proxy (lazy SDK init)
    ├── finnhub/route.ts        # Finnhub proxy w/ revalidate: 3600
    └── pmi/route.ts            # Heisenberg PMI proxy (no cache)

lib/
├── orchestrator.ts             # runStockResearch / runCryptoResearch + 4h localStorage cache
├── agents.ts                   # AGENTS[] + tier color map
├── cryptoData.ts               # Seeded CoinGecko snapshot
├── format.ts                   # fmt / fmtPrice / pct helpers
└── types.ts

components/
├── ResearchEngine.tsx          # Root: nav + sidebar + result
├── SearchSidebar.tsx           # Search box + recents + live agent status
├── ResultPage.tsx              # Verdict + finding cards + idle "+ Run" buttons
├── VerdictCard.tsx
├── AgentFindingCard.tsx
├── AgentStatusList.tsx
├── AgentsGrid.tsx              # The original agent grid (Agents tab)
├── Sparkline.tsx
└── panels/                     # Migrated prototype panels — Agents-tab only
    ├── StandardPanel.tsx
    ├── CryptoPanel.tsx
    ├── PredMktPanel.tsx
    └── IntelHubPanel.tsx

financial-agents-dashboard.jsx  # Original 1,450-line prototype (kept for reference, excluded from tsconfig)
CLAUDE.md                       # Full design spec
```

**Rule:** all client fetches go through `/api/*`. Never call `api.anthropic.com`, `finnhub.io`, or `narrative.agent.heisenberg.so` directly from a component.

---

## Tabs

- **Stocks** (default) — search a ticker, get a research verdict.
- **Crypto** — same flow, scoped to crypto.
- **Agents** — the original prototype grid; clicking an agent opens its detail panel. Useful for browsing what each agent can do or chatting with one directly. Not the primary surface.

---

## Caching

Two layers, zero infrastructure:

| Layer | What | TTL | Where |
|---|---|---|---|
| `next: { revalidate }` | Finnhub raw responses | 1h | `app/api/finnhub/route.ts` |
| `localStorage` | Full Claude synthesis result (verdict + findings) | 4h | `lib/orchestrator.ts` (`getCached` / `setCache`) |
| no cache | PMI feed | — | `cache: "no-store"` in `app/api/pmi/route.ts` |

The result page shows `cached · refreshes in Xh` and a manual `↺ Refresh` button (clears the cache key and re-runs).

When you outgrow `localStorage`, swap it for Upstash Redis — same shape, same call sites; see [CLAUDE.md](CLAUDE.md#future-upstash-redis-when-ready-to-upgrade).

---

## Tech

- **Next.js 14** App Router
- **TypeScript** strict
- **Tailwind CSS** + a few inline styles for agent accent colors
- **DM Mono** + **DM Sans** (Google Fonts)
- **`@anthropic-ai/sdk`** server-side via `app/api/chat`
- No external state library — just `useState` / `useEffect`

---

## Common tasks

**Add a new agent that runs automatically on stock search**
1. Add it to `AGENTS` in `lib/agents.ts` and to `STOCK_AUTO_AGENTS`.
2. Add a runner function in `lib/orchestrator.ts` following the `runEarningsReviewer` pattern.
3. Add it to the `Promise.all` in `runStockResearch`.

**Add a new agent that's manually triggered only**
1. Add it to `AGENTS` in `lib/agents.ts` (do not add to the auto list).
2. It will appear as a `+ Run` button on the result page automatically. `runAgentManually` handles the generic case via Claude; add a custom branch in the switch if it needs special data fetching.

**Refresh stale verdicts**
Click `↺ Refresh` on the result page, or run `localStorage.clear()` in DevTools.

**Rotate the PMI JWT**
Paste a new value in `.env.local` and restart `npm run dev`.

---

## Roadmap

1. Recent searches with colored dot per asset class (done — localStorage)
2. Watchlist persistence + re-run research on demand
3. Background signal feed (cron `runStockResearch` over watchlist every 30min)
4. CoinGecko live (replace seeded snapshot with cached Route Handler, `revalidate: 60`)
5. Settings page to paste a fresh PMI JWT without editing `.env.local`
6. Model Builder wired to Finnhub financials for real DCF inputs
7. Portfolio view — enter holdings, get portfolio-level daily briefing
8. Upstash Redis cache + per-agent run counters

See [CLAUDE.md](CLAUDE.md) for the full design spec.
