# Financial Research Engine — CLAUDE.md

## Project Overview

A personal financial research engine. The user types a stock ticker or crypto symbol, and multiple specialized agents fire in parallel to gather data, then synthesize it into a unified investment verdict — tuned for a **long-term, buy-and-hold equity investor**.

This is not a dashboard of agents. It is a search-driven research engine where agents are the backend workers, not the UI.

---

## Core User Flow

```
User types "NVDA"
  → 4 agents fire in parallel
      ✓ Earnings Reviewer    — fetches filings, transcript, EPS vs estimate
      ✓ Market Researcher    — pulls news, sector context, analyst revisions
      ✓ Prediction Markets   — scans Polymarket/Kalshi for related macro markets
      ✓ Intelligence Hub     — waits for above, then synthesizes verdict
  → Single result page renders:
      - Price + today's change (Finnhub live)
      - Intelligence Hub verdict (bold headline + 3-4 sentence thesis)
      - Agent findings grid (one card per agent that ran)
      - Idle agents shown as "+ Run" buttons
```

Same flow for crypto — type "SOL":
```
  → Crypto Intelligence    — price, dominance, sparkline, gainers context
  → Prediction Markets     — any SOL-related Polymarket markets
  → Intelligence Hub       — synthesizes crypto verdict
```

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + inline styles (migrated from a single-file React prototype)
- **Fonts**: DM Mono + DM Sans (Google Fonts)
- **State**: React `useState` / `useEffect` — no external state library
- **API layer**: Next.js Route Handlers (`app/api/`) for all server-side calls

---

## Project Structure

```
financial-dashboard/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Renders <ResearchEngine />
│   └── api/
│       ├── chat/route.ts           # Anthropic proxy
│       ├── finnhub/route.ts        # Finnhub proxy
│       └── pmi/route.ts            # Heisenberg PMI proxy
├── components/
│   ├── ResearchEngine.tsx          # Root: nav (Stocks/Crypto/Agents tabs) + layout
│   ├── SearchSidebar.tsx           # Search box + recent searches + agent run status
│   ├── ResultPage.tsx              # Renders verdict + agent findings for a ticker
│   ├── VerdictCard.tsx             # The Intelligence Hub synthesis at the top
│   ├── AgentFindingCard.tsx        # One card per agent that ran (with accent color)
│   ├── AgentStatusList.tsx         # Sidebar: shows running/done/idle for current run
│   └── panels/                     # Original agent detail panels (kept for Agents tab)
│       ├── StandardPanel.tsx
│       ├── CryptoPanel.tsx
│       ├── PredMktPanel.tsx
│       └── IntelHubPanel.tsx
├── lib/
│   ├── agents.ts                   # AGENTS array — all agent definitions
│   ├── orchestrator.ts             # Core: runStockResearch() and runCryptoResearch()
│   ├── cryptoData.ts               # Seeded CoinGecko snapshot (replace with live fetch)
│   └── types.ts                    # TypeScript types
├── .env.local
└── CLAUDE.md
```

---

## The Orchestrator — `lib/orchestrator.ts`

This is the core new piece. It fires agents in parallel and merges results.

```typescript
export async function runStockResearch(ticker: string): Promise<StockResearchResult> {
  const [quote, earnings, news, pmiSignals] = await Promise.all([
    fetchFinnhubQuote(ticker),
    runEarningsReviewer(ticker),
    runMarketResearcher(ticker),
    scanPMIForTicker(ticker),
  ]);

  const verdict = await runIntelligenceHub({
    ticker, quote, earnings, news, pmiSignals,
    investorProfile: "long-term buy-and-hold equity investor",
  });

  return { ticker, quote, earnings, news, pmiSignals, verdict };
}

export async function runCryptoResearch(symbol: string): Promise<CryptoResearchResult> {
  const [priceData, pmiSignals] = await Promise.all([
    fetchCoinGeckoData(symbol),
    scanPMIForCrypto(symbol),
  ]);

  const verdict = await runIntelligenceHub({
    symbol, priceData, pmiSignals,
    investorProfile: "long-term crypto investor",
  });

  return { symbol, priceData, pmiSignals, verdict };
}
```

Each agent runner calls `/api/chat` with a specialized system prompt and the live data as context:

```typescript
async function runEarningsReviewer(ticker: string) {
  const news = await fetch(`/api/finnhub?path=/company-news?symbol=${ticker}&from=...`);
  return callAgent("earnings-reviewer", { ticker, news });
}
```

---

## UI Layout

### Navigation
Three tabs in the top nav:
- **Stocks** — default view, search for equities
- **Crypto** — same layout, search for tokens
- **Agents** — the original agent grid from the prototype (secondary view)

### Result Page Layout
```
┌──────────────────────────────────────────────────────────┐
│ Nav: Stocks | Crypto | Agents                            │
├──────────────────┬───────────────────────────────────────┤
│ Sidebar          │ Result Content                        │
│                  │                                        │
│ [Search box]     │ NVDA                    $875.40       │
│                  │ NVIDIA Corp · Nasdaq    +2.14%        │
│ Recent:          │                                        │
│ • NVDA           │ ┌─ Intelligence Hub verdict ─────────┐│
│ • MSFT           │ │ STRONG BUY (long-term) · summary   ││
│ • AAPL           │ └────────────────────────────────────┘│
│                  │                                        │
│ ─ Agent Run ──   │ ─ Agent findings ──                   │
│ ✓ Earnings Rev   │ [Earnings] [Market]                   │
│ ✓ Market Res     │ [Pred Mkt] [Intel Hub]                │
│ ⟳ Pred Markets   │                                        │
│ ✓ Intel Hub      │ ─ Idle agents ──                      │
│                  │ [+ Model Builder] [+ Valuation Rev]   │
│ · Model Builder  │ [+ Pitch Builder]                     │
│ · Val. Reviewer  │                                        │
└──────────────────┴───────────────────────────────────────┘
```

### Agent Status in Sidebar
While a search is running, the sidebar shows live status per agent:
- `running` — pulsing amber dot
- `done` — green dot + "done" badge
- `idle` — gray dot — agents that didn't fire for this query

Idle agents appear as `+ Run` buttons at the bottom of the result page. Clicking triggers that agent and appends its finding card.

---

## Environment Variables

```bash
# .env.local

ANTHROPIC_API_KEY=sk-ant-...

NEXT_PUBLIC_FINNHUB_KEY=your_finnhub_key
# Get from: finnhub.io/dashboard

PMI_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Get from: narrative.agent.heisenberg.so → DevTools → Network → Authorization header
# This JWT expires — paste a fresh one here when it stops working
```

- `ANTHROPIC_API_KEY` — server only, never expose to client
- `PMI_JWT` — server only (user JWT)
- `NEXT_PUBLIC_FINNHUB_KEY` — can be public, but prefer proxying

---

## API Route Handlers

### `/api/chat` — Anthropic Proxy

```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();

export async function POST(req: Request) {
  const { system, messages, max_tokens = 1500 } = await req.json();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens,
    system,
    messages,
  });
  return Response.json(response);
}
```

All Claude calls from the frontend use this — never call `api.anthropic.com` directly:

```typescript
const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ system, messages }),
});
const data = await res.json();
const text = data.content?.find((b: any) => b.type === "text")?.text;
```

### `/api/finnhub` — Finnhub Proxy

```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const res = await fetch(
    `https://finnhub.io/api/v1${path}&token=${process.env.NEXT_PUBLIC_FINNHUB_KEY}`
  );
  return Response.json(await res.json());
}
```

### `/api/pmi` — Heisenberg PMI Proxy

```typescript
export async function POST(req: Request) {
  const { agent_id, params, limit = 10 } = await req.json();
  const res = await fetch(
    "https://narrative.agent.heisenberg.so/api/v1/retrieval/parameterized/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PMI_JWT}`,
      },
      body: JSON.stringify({ agent_id, params, limit, offset: 0 }),
    }
  );
  return Response.json(await res.json());
}
```

---

## Agent System Prompts

Each agent in `lib/orchestrator.ts` has a specialized system prompt. All end with:

> "You are analyzing this for a long-term, buy-and-hold investor with a 3-10 year horizon. Filter out short-term noise. Focus on what affects the multi-year thesis. Be direct — if the data doesn't support action, say so."

### Agents that run automatically on stock search
| Agent | Role | Data source |
|-------|------|-------------|
| Earnings Reviewer | Recent EPS vs estimate, guidance, revenue trend | Finnhub earnings + news |
| Market Researcher | Headlines, sector context, analyst revisions | Finnhub company news |
| Prediction Markets | Related macro/company Polymarket markets | Heisenberg PMI agent 575 |
| Intelligence Hub | Synthesizes all above into verdict | Claude (waits for above) |

### Agents that run automatically on crypto search
| Agent | Role | Data source |
|-------|------|-------------|
| Crypto Intelligence | Price, dominance, 7d sparkline | CoinGecko public API |
| Prediction Markets | Token-related Polymarket markets | Heisenberg PMI agent 575 |
| Intelligence Hub | Synthesizes into crypto verdict | Claude |

### Agents idle until manually triggered
Model Builder, Valuation Reviewer, Pitch Builder, KYC Screener, GL Reconciler,
Month-End Closer, Statement Auditor, Meeting Preparer

---

## Data Sources & PMI Agent IDs

### Heisenberg PMI
| Agent ID | Name | Params |
|----------|------|--------|
| 575 | Market 360 (spiking markets) | `min_volume_24h`, `volume_trend` |
| 584 | Heisenberg Leaderboard | `min_pnl_15d`, `sort_by` |
| 556 | Polymarket Trades | `proxy_wallet`, `condition_id`, `start_time` (unix) |
| 586 | Wallet Stat All Time | `wallet_address` |

### Finnhub Endpoints
| Endpoint | Used for |
|----------|---------|
| `/quote?symbol=X` | Live price + daily change |
| `/company-news?symbol=X&from=Y&to=Z` | Recent news for a ticker |
| `/calendar/earnings?from=Y&to=Z` | Earnings calendar |
| `/market-news?category=general` | Top headlines (Intel Hub briefing) |

### CoinGecko (public, no key needed)
```
GET /v3/coins/markets?vs_currency=usd&ids={id}&sparkline=true&price_change_percentage=1h,24h,7d
GET /v3/global
GET /v3/coins/top_gainers_losers?vs_currency=usd
GET /v3/search?query={symbol}   ← resolve symbol → CoinGecko coin ID
```
Base URL: `https://api.coingecko.com/api/v3`

---

## TypeScript Types

```typescript
// lib/types.ts

type AgentStatus = "running" | "done" | "idle" | "error";

type AgentFinding = {
  agentSlug: string;
  agentName: string;
  accentColor: string;
  status: AgentStatus;
  summary: string;
  raw?: any;
};

type Verdict = {
  rating: "STRONG BUY" | "BUY" | "HOLD" | "AVOID";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
};

type StockResearchResult = {
  ticker: string;
  quote: { price: number; change: number; changePct: number };
  verdict: Verdict;
  findings: AgentFinding[];
};

type CryptoResearchResult = {
  symbol: string;
  priceData: {
    price: number;
    change24h: number;
    marketCap: number;
    sparkline: number[];
  };
  verdict: Verdict;
  findings: AgentFinding[];
};

type Agent = {
  slug: string;
  name: string;
  vertical: "Research & Coverage" | "Finance & Operations" | "Crypto & Digital Assets" | "Intelligence";
  icon: string;
  color: string;
  description: string;
  skills: string[];
  commands: string[];
  connectors: string[];
  subagents: string[];
  security_tier: string;
  status: "running" | "deployed" | "idle";
  lastRun: string;
  runsToday: number;
  isCryptoAgent?: boolean;
  isPredMktAgent?: boolean;
  isIntelHub?: boolean;
};
```

---

## Design System

```
Backgrounds:  #070910 (page), #0b0d14 (panels), #0f1117 (cards), #09090f (inset)
Borders:      #1a1d2e (default), #2a2d3e (subtle)
Text:         #f0f2f8 (primary), #8b9ab8 (secondary), #4a5170 (muted), #3a4060 (very muted)
Font mono:    'DM Mono', monospace
Font sans:    'DM Sans', sans-serif

Status colors:
  Running / done:  #4ade80 (green, pulsing when running)
  Idle:            #2a3050
  Error:           #f87171

Agent accent colors:
  Earnings Reviewer:   #9EC87E
  Market Researcher:   #9E7EC8
  Prediction Markets:  #A78BFA
  Intelligence Hub:    #E879F9
  Crypto Intelligence: #F0B429
  Model Builder:       #C87E9E
  Pitch Builder:       #C8A97E
  Valuation Reviewer:  #C8B77E
  KYC Screener:        #C8987E
  GL Reconciler:       #7EC8B8
  Statement Auditor:   #7E9EC8
  Meeting Preparer:    #7EB8C8
  Month-End Closer:    #C87E7E
```

---

## What's Seeded vs Live

| Data | Status | Notes |
|------|--------|-------|
| Stock quotes | Live | Finnhub on every search |
| Company news | Live | Finnhub `/company-news` |
| Earnings calendar | Live | Finnhub, current week |
| CoinGecko prices | Seeded | Replace `lib/cryptoData.ts` with live CoinGecko Route Handler, `revalidate: 60` |
| Heisenberg PMI markets | Live | Agent 575 |
| Heisenberg PMI wallets | Live | Agent 584 |
| Heisenberg PMI trades | Live | Agent 556 |
| Claude verdicts + findings | Live | Via `/api/chat` |
| Price charts (1M/6M/1Y) | Live | `/api/market/history` — every researched asset shows a range-selectable chart; stocks via FMP→Yahoo fallback, crypto via CoinGecko `market_chart` |
| Markets headline digest | Live (daily) | `/api/market/digest` — Claude curates the top ~6 general headlines with a plain-English "why it matters" + Positive/Neutral/Negative tag for new investors; DB-cached once per ET day (`market_digest`), same pattern as the briefing. Sector headlines stay raw, collapsed below it |
| Markets Stocks/Crypto toggle | Live | The Markets tab has a Stocks (default) / Crypto toggle. Crypto view = daily crypto briefing (`/api/market/briefing?kind=crypto`, a 2nd row of `market_briefing`) + global stats + top-10 by market cap + 24h movers from `/api/market/crypto` (CoinGecko, seeded `LIVE_DATA` fallback). Clicking a coin opens it in crypto research mode |

---

## Migrating from the Prototype

The prototype (`financial-agents-dashboard.jsx`) is a single 1,400-line React component. Steps to migrate:

1. Extract `AGENTS` array → `lib/agents.ts`
2. Extract `CryptoDetailPanel` → `components/panels/CryptoPanel.tsx`
3. Extract `PredMktDetailPanel` → `components/panels/PredMktPanel.tsx`
4. Extract `IntelHubPanel` → `components/panels/IntelHubPanel.tsx`
5. Replace all `fetch("https://api.anthropic.com/v1/messages", ...)` → `fetch("/api/chat", ...)`
6. Replace all direct Finnhub `fetch` calls → `fetch("/api/finnhub?path=...")`
7. Replace all direct PMI `fetch` calls → `fetch("/api/pmi", { method: "POST", body: ... })`
8. Build new `ResearchEngine.tsx`, `SearchSidebar.tsx`, `ResultPage.tsx` as the entry point
9. Keep original panels accessible under the Agents tab

---

## Roadmap

1. **Recent searches** — persist in `localStorage`, show in sidebar with colored dot per asset
2. **Watchlist** — save tickers, re-run research on demand
3. **Live signal feed** — background job runs `runStockResearch` on watchlist every 30min, surfaces changes
4. **CoinGecko live** — replace seeded snapshot with cached Route Handler
5. **PMI JWT refresh UI** — settings page to paste a new JWT when it expires
6. **Model Builder** — wire DCF to Finnhub financials endpoint for real numbers
7. **Portfolio view** — enter holdings, get portfolio-level daily briefing

---

## Running Locally

```bash
npx create-next-app@latest financial-dashboard --typescript --tailwind --app
cd financial-dashboard
npm install @anthropic-ai/sdk

# Create .env.local with the three keys above
# Copy the prototype JSX into components/ as reference

npm run dev
# → http://localhost:3000
```

---

## Caching Strategy

### Current Implementation

Two-layer cache — zero cost, zero infrastructure.

**Layer 1: Next.js `revalidate` — raw API data**

Add to every Finnhub and CoinGecko fetch in the Route Handlers:

```typescript
// app/api/finnhub/route.ts
const res = await fetch(url, {
  next: { revalidate: 3600 } // cache 1 hour at the server level
});
```

This means 100 searches for NVDA in one hour = 1 Finnhub call. Completely automatic, no extra code.

Do NOT cache PMI trade feed — it's live on-chain data, always fetch fresh.

**Layer 2: `localStorage` — full Claude synthesis results**

In `lib/orchestrator.ts`, wrap `runStockResearch` and `runCryptoResearch` with a cache check before firing any agents:

```typescript
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`research:${key}`);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(`research:${key}`);
      return null;
    }
    return data as T;
  } catch { return null; }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`research:${key}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {} // storage full — fail silently
}

export async function runStockResearch(ticker: string): Promise<StockResearchResult> {
  const cached = getCached<StockResearchResult>(ticker.toUpperCase());
  if (cached) return cached;

  // ... run agents ...

  setCache(ticker.toUpperCase(), result);
  return result;
}
```

Show a "cached · refreshes in Xh" label on the result page so the user knows when data is stale. Add a manual "↺ Refresh" button that clears the cache key and re-runs.

**Cache TTLs:**

| Data | TTL | Reason |
|------|-----|--------|
| Finnhub quotes + news | 1 hour | `revalidate: 3600` in Route Handler |
| CoinGecko prices | 1 hour | `revalidate: 3600` in Route Handler |
| Claude synthesis (full result) | 4 hours | `localStorage` in orchestrator |
| PMI trade feed | No cache | Live on-chain data |
| PMI leaderboard / markets | 1 hour | `revalidate: 3600` in Route Handler |

---

### Future: Upstash Redis (when ready to upgrade)

When you want cache to persist across devices, browsers, or deployments — swap `localStorage` for Upstash Redis. Free tier is 10k requests/day, more than enough for personal use.

**Setup:**
1. Create a free database at upstash.com
2. Add to `.env.local`:
```bash
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```
3. Install: `npm install @upstash/redis`

**Drop-in replacement for the localStorage helpers:**

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function getCached<T>(key: string): Promise<T | null> {
  const data = await redis.get<T>(`research:${key}`);
  return data ?? null;
}

async function setCache<T>(key: string, data: T, ttlSeconds = 14400): Promise<void> {
  await redis.setex(`research:${key}`, ttlSeconds, data);
}
```

The orchestrator functions become `async` for the cache calls — everything else stays the same. The `revalidate` layer on the Route Handlers doesn't change at all.

**Why Redis over localStorage long-term:**
- Persists across devices — search NVDA on your phone, cached on desktop too
- Survives browser storage clears
- Can share cache across multiple users if you ever open this up
- Better observability — you can see what's cached in the Upstash dashboard
