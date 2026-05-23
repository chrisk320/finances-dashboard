import { getAgent } from "./agents";
import { findCoinBySymbol, LIVE_DATA } from "./cryptoData";
import { getHolding } from "./portfolio";
import type {
  AgentFinding,
  AgentSignal,
  AgentStatus,
  CryptoMetrics,
  CryptoResearchResult,
  NewsEvent,
  NewsImpact,
  Quote,
  StockResearchResult,
  ValuationMetrics,
  Verdict,
} from "./types";

const INVESTOR_PROFILE_SUFFIX = `\n\nYou are analyzing this for a long-term, buy-and-hold investor with a 3-10 year horizon. Filter out short-term noise. Focus on what affects the multi-year thesis. Be direct — if the data doesn't support action, say so.`;

const CACHE_TTL_MS = 1000 * 60 * 60 * 4;

type ProgressFn = (slug: string, status: AgentStatus, finding?: AgentFinding) => void;

// ---------- Cache helpers (localStorage, browser only) ----------

export function getCached<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`research:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; timestamp: number };
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      window.localStorage.removeItem(`research:${key}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `research:${key}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // storage full — fail silently
  }
}

export function clearCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`research:${key}`);
  } catch {}
}

export const cacheTtlMs = CACHE_TTL_MS;

// ---------- Anthropic call ----------

async function callClaude(
  system: string,
  userMessage: string,
  maxTokens = 1200
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: system + INVESTOR_PROFILE_SUFFIX,
      messages: [{ role: "user", content: userMessage }],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`chat ${res.status}`);
  const data = await res.json();
  const text = data.content?.find((b: any) => b.type === "text")?.text;
  if (typeof text !== "string") throw new Error("no text in response");
  return text;
}

// ---------- Finnhub ----------

async function finnhub<T = any>(path: string): Promise<T> {
  const res = await fetch(`/api/finnhub?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`finnhub ${res.status}`);
  return res.json();
}

async function fetchFinnhubQuote(ticker: string): Promise<Quote> {
  const data = await finnhub<{
    c: number;
    d: number;
    dp: number;
    pc: number;
  }>(`/quote?symbol=${encodeURIComponent(ticker)}`);
  return {
    price: data.c ?? 0,
    change: data.d ?? 0,
    changePct: data.dp ?? 0,
  };
}

async function fetchCompanyNews(
  ticker: string,
  daysBack = 14
): Promise<any[]> {
  const to = new Date();
  const from = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
  const path = `/company-news?symbol=${encodeURIComponent(
    ticker
  )}&from=${fmtDate(from)}&to=${fmtDate(to)}`;
  try {
    const data = await finnhub<any[]>(path);
    return Array.isArray(data) ? data.slice(0, 20) : [];
  } catch {
    return [];
  }
}

type EarningsQuarter = {
  period?: string;
  actual?: number | null;
  estimate?: number | null;
  surprise?: number | null;
  surprisePercent?: number | null;
};

async function fetchEarningsHistory(ticker: string): Promise<EarningsQuarter[]> {
  try {
    const data = await finnhub<EarningsQuarter[]>(
      `/stock/earnings?symbol=${encodeURIComponent(ticker)}`
    );
    return Array.isArray(data) ? data.slice(0, 4) : [];
  } catch {
    return [];
  }
}

const SECTOR_ETF: Record<string, string> = {
  "information technology": "XLK",
  technology: "XLK",
  "communication services": "XLC",
  "health care": "XLV",
  healthcare: "XLV",
  financials: "XLF",
  financial: "XLF",
  "consumer discretionary": "XLY",
  "consumer staples": "XLP",
  energy: "XLE",
  industrials: "XLI",
  industrial: "XLI",
  materials: "XLB",
  "basic materials": "XLB",
  utilities: "XLU",
  "real estate": "XLRE",
};

type CompanyProfile = {
  name?: string;
  sector?: string;
  industry?: string;
};

async function fetchCompanyProfile(
  ticker: string
): Promise<CompanyProfile | null> {
  try {
    const data = await finnhub<{
      name?: string;
      gicsSector?: string;
      finnhubIndustry?: string;
    }>(`/stock/profile2?symbol=${encodeURIComponent(ticker)}`);
    if (!data || (!data.name && !data.gicsSector && !data.finnhubIndustry)) {
      return null;
    }
    return {
      name: data.name,
      sector: data.gicsSector ?? data.finnhubIndustry,
      industry: data.finnhubIndustry,
    };
  } catch {
    return null;
  }
}

function resolveSectorEtf(sector?: string | null): string | null {
  if (!sector) return null;
  const key = sector.toLowerCase().trim();
  if (SECTOR_ETF[key]) return SECTOR_ETF[key];
  // Loose match for things like "Semiconductors" → tech, "Banking" → financials.
  for (const [k, etf] of Object.entries(SECTOR_ETF)) {
    if (key.includes(k)) return etf;
  }
  return null;
}

// Finnhub's /stock/metric returns a flat dict with verbose keys. We pluck the
// long-term-investor-relevant fields and return null when missing so the
// downstream panel + agent can hide what they don't have.
async function fetchValuationMetrics(ticker: string): Promise<ValuationMetrics> {
  try {
    const data = await finnhub<{ metric?: Record<string, number | null> }>(
      `/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all`
    );
    const m = data?.metric ?? {};
    const num = (k: string): number | null => {
      const v = m[k];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    };
    return {
      peTTM: num("peTTM") ?? num("peBasicExclExtraTTM") ?? num("peExclExtraTTM"),
      evEbitdaTTM: num("currentEv/freeCashFlowTTM") ?? num("evEbitdaTTM"),
      psTTM: num("psTTM"),
      fcfMarginTTM: num("fcfMarginTTM"),
      roeTTM: num("roeTTM"),
      debtEquityAnnual: num("totalDebt/totalEquityAnnual"),
      dividendYieldTTM: num("currentDividendYieldTTM") ?? num("dividendYieldIndicatedAnnual"),
      week52High: num("52WeekHigh"),
      week52Low: num("52WeekLow"),
    };
  } catch (e) {
    console.error("[fetchValuationMetrics]", e);
    return {};
  }
}

// ---------- PMI ----------

async function pmiQuery(
  agentId: number,
  params: Record<string, any>,
  limit = 10
): Promise<any> {
  const res = await fetch("/api/pmi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id: agentId, params, limit }),
  });
  if (!res.ok) throw new Error(`pmi ${res.status}`);
  return res.json();
}

async function scanPMIForTicker(_ticker: string): Promise<any[]> {
  try {
    const data = await pmiQuery(
      575,
      { min_volume_24h: "50000", volume_trend: "Spiking" },
      8
    );
    return data?.data?.results ?? data?.results ?? [];
  } catch (e) {
    console.error("[scanPMIForTicker]", e);
    return [];
  }
}

async function scanPMIForCrypto(_symbol: string): Promise<any[]> {
  return scanPMIForTicker(_symbol);
}

// ---------- Agent runners ----------

function makeFinding(
  slug: string,
  summary: string,
  status: AgentStatus = "done",
  raw?: any,
  extras?: { headline?: string; signal?: AgentSignal; bullets?: string[] }
): AgentFinding {
  const agent = getAgent(slug);
  return {
    agentSlug: slug,
    agentName: agent?.name ?? slug,
    accentColor: agent?.color ?? "#8b9ab8",
    status,
    summary,
    raw,
    ...(extras?.headline ? { headline: extras.headline } : {}),
    ...(extras?.signal ? { signal: extras.signal } : {}),
    ...(extras?.bullets?.length ? { bullets: extras.bullets } : {}),
  };
}

const STRUCTURED_FORMAT = `

Respond using EXACTLY this format and nothing else:

HEADLINE: <single-sentence bottom line, under 15 words>
SIGNAL: BULLISH | NEUTRAL | BEARISH
- <bullet one, key data point, under 15 words>
- <bullet two>
- <bullet three>

Rules:
- Exactly 2-3 bullets. Each starts with "- ".
- SIGNAL must be one of BULLISH, NEUTRAL, BEARISH (uppercase, no other text on that line).
- No headers, no extra prose, no markdown bold/italic.`;

function parseAgentResponse(raw: string): {
  headline?: string;
  signal?: AgentSignal;
  bullets?: string[];
} {
  try {
    const lines = raw.split(/\r?\n/).map((l) => l.trim());
    let headline: string | undefined;
    let signal: AgentSignal | undefined;
    const bullets: string[] = [];

    for (const line of lines) {
      if (!line) continue;
      const headlineMatch = line.match(/^HEADLINE\s*:\s*(.+)$/i);
      if (headlineMatch && !headline) {
        headline = headlineMatch[1].trim();
        continue;
      }
      const signalMatch = line.match(/^SIGNAL\s*:\s*(BULLISH|NEUTRAL|BEARISH)/i);
      if (signalMatch && !signal) {
        signal = signalMatch[1].toUpperCase() as AgentSignal;
        continue;
      }
      const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
      if (bulletMatch) {
        bullets.push(bulletMatch[1].trim());
      }
    }

    if (!headline && !signal && bullets.length === 0) return {};
    return {
      headline,
      signal,
      bullets: bullets.length ? bullets.slice(0, 3) : undefined,
    };
  } catch {
    return {};
  }
}

async function runEarningsReviewer(ticker: string): Promise<AgentFinding> {
  try {
    const [news, earnings] = await Promise.all([
      fetchCompanyNews(ticker, 90),
      fetchEarningsHistory(ticker),
    ]);

    const headlines = news
      .slice(0, 12)
      .map((n) => `- ${n.headline ?? n.title ?? ""} (${n.source ?? ""})`)
      .join("\n");

    const earningsBlock = earnings.length
      ? earnings
          .map((q) => {
            const actual = q.actual != null ? `$${q.actual}` : "n/a";
            const est = q.estimate != null ? `$${q.estimate}` : "n/a";
            const surprise =
              q.surprisePercent != null
                ? ` (${q.surprisePercent >= 0 ? "+" : ""}${q.surprisePercent.toFixed(
                    2
                  )}% vs est)`
                : "";
            return `- ${q.period ?? "—"}: EPS actual ${actual} vs est ${est}${surprise}`;
          })
          .join("\n")
      : "(no earnings history returned by Finnhub)";

    const system = `You are the Earnings Reviewer agent. You analyze recent earnings releases, transcripts, and filings for thesis-relevant signals.`;
    const user = `Ticker: ${ticker}\n\nEarnings history (most recent quarters first):\n${earningsBlock}\n\nRecent company news (last 90 days):\n${
      headlines || "(no news)"
    }\n\nCover: the most recent quarter's beat/miss/in-line with the actual surprise %, the trajectory across the quarters shown, forward guidance or thesis-relevant news, and one concern or positive worth tracking. Anchor on the hard EPS numbers when available — only use headlines to add color.${STRUCTURED_FORMAT}`;

    const summary = await callClaude(system, user, 600);
    const parsed = parseAgentResponse(summary);
    return makeFinding(
      "earnings-reviewer",
      summary,
      "done",
      { news, earnings },
      parsed
    );
  } catch (e: any) {
    return {
      ...makeFinding("earnings-reviewer", "Earnings data unavailable.", "error"),
      error: e?.message ?? "error",
    };
  }
}

async function runMarketResearcher(ticker: string): Promise<AgentFinding> {
  try {
    const news = await fetchCompanyNews(ticker, 7);
    const headlines = news
      .slice(0, 12)
      .map((n) => `- ${n.headline ?? n.title ?? ""}`)
      .join("\n");
    const system = `You are the Market Researcher agent. You synthesize headlines, sector context, and analyst revisions into a clear read on the multi-year thesis.`;
    const user = `Ticker: ${ticker}\n\nRecent headlines (last 7 days):\n${headlines || "(no news)"}\n\nCover: dominant narrative this week, sector tailwind or headwind, and the net read for a long-term holder.${STRUCTURED_FORMAT}`;
    const summary = await callClaude(system, user, 600);
    const parsed = parseAgentResponse(summary);
    return makeFinding("market-researcher", summary, "done", { news }, parsed);
  } catch (e: any) {
    return {
      ...makeFinding("market-researcher", "Market data unavailable.", "error"),
      error: e?.message ?? "error",
    };
  }
}

function formatMetricsBlock(m: ValuationMetrics): string {
  const lines: string[] = [];
  if (m.peTTM != null) lines.push(`- P/E TTM: ${m.peTTM.toFixed(2)}`);
  if (m.evEbitdaTTM != null)
    lines.push(`- EV/EBITDA TTM: ${m.evEbitdaTTM.toFixed(2)}`);
  if (m.psTTM != null) lines.push(`- P/S TTM: ${m.psTTM.toFixed(2)}`);
  if (m.fcfMarginTTM != null)
    lines.push(`- FCF margin TTM: ${m.fcfMarginTTM.toFixed(2)}%`);
  if (m.roeTTM != null) lines.push(`- ROE TTM: ${m.roeTTM.toFixed(2)}%`);
  if (m.debtEquityAnnual != null)
    lines.push(`- Debt/Equity: ${m.debtEquityAnnual.toFixed(2)}`);
  if (m.dividendYieldTTM != null)
    lines.push(`- Dividend yield: ${m.dividendYieldTTM.toFixed(2)}%`);
  if (m.week52High != null && m.week52Low != null)
    lines.push(
      `- 52-week range: $${m.week52Low.toFixed(2)} – $${m.week52High.toFixed(2)}`
    );
  return lines.length ? lines.join("\n") : "(no valuation metrics returned)";
}

async function runValuationReviewer(
  ticker: string,
  metrics: ValuationMetrics
): Promise<AgentFinding> {
  try {
    const hasAny = Object.values(metrics).some((v) => v != null);
    if (!hasAny) {
      return makeFinding(
        "valuation-reviewer",
        `No valuation metrics returned for ${ticker}.`,
        "done",
        metrics,
        {
          headline: `No valuation metrics available for ${ticker}.`,
          signal: "NEUTRAL",
          bullets: ["Finnhub returned no usable fields for this ticker."],
        }
      );
    }
    const system = `You are the Valuation Reviewer agent. You assess whether the current price is reasonable for a long-term, buy-and-hold investor — relative to history, peers, and underlying cash generation.`;
    const user = `Ticker: ${ticker}\n\nValuation snapshot (Finnhub /stock/metric):\n${formatMetricsBlock(
      metrics
    )}\n\nCover: where this trades vs reasonable benchmarks for a quality compounder (e.g. P/E < 18 cheap, 18-30 fair, > 30 premium), what the cash-flow and balance-sheet quality suggest, and whether the price is attractive, fair, or stretched. SIGNAL = BULLISH (cheap), NEUTRAL (fair), BEARISH (expensive).${STRUCTURED_FORMAT}`;
    const summary = await callClaude(system, user, 600);
    const parsed = parseAgentResponse(summary);
    return makeFinding("valuation-reviewer", summary, "done", metrics, parsed);
  } catch (e: any) {
    return {
      ...makeFinding("valuation-reviewer", "Valuation data unavailable.", "error"),
      error: e?.message ?? "error",
    };
  }
}

function parseNewsEventsResponse(raw: string): NewsEvent[] {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    const allowed: NewsImpact[] = ["positive", "neutral", "negative"];
    return arr
      .map((e: any): NewsEvent | null => {
        if (!e || typeof e !== "object") return null;
        const title = String(e.title ?? "").trim();
        if (!title) return null;
        const scope = e.scope === "sector" ? "sector" : "company";
        const impactRaw = String(e.impact ?? "").toLowerCase();
        const impact: NewsImpact = (allowed as string[]).includes(impactRaw)
          ? (impactRaw as NewsImpact)
          : "neutral";
        return {
          title,
          source: String(e.source ?? "").trim(),
          url: typeof e.url === "string" && e.url ? e.url : undefined,
          publishedAt:
            typeof e.publishedAt === "number" ? e.publishedAt : undefined,
          scope,
          impact,
          rationale: String(e.rationale ?? "").trim(),
        };
      })
      .filter((e): e is NewsEvent => e !== null)
      .slice(0, 8);
  } catch {
    return [];
  }
}

function compactHeadlines(items: any[], max = 15): string {
  return items
    .slice(0, max)
    .map((n) => {
      const title = n.headline ?? n.title ?? "";
      const source = n.source ? ` [${n.source}]` : "";
      const url = n.url ? ` (${n.url})` : "";
      const ts =
        typeof n.datetime === "number"
          ? ` @${new Date(n.datetime * 1000).toISOString().slice(0, 10)}`
          : "";
      return `- ${title}${source}${ts}${url}`;
    })
    .join("\n");
}

async function runNewsAnalyst(
  ticker: string,
  sector: string | null,
  companyNews: any[],
  sectorNews: any[],
  sectorEtf: string | null
): Promise<{ finding: AgentFinding; events: NewsEvent[] }> {
  try {
    if (companyNews.length === 0 && sectorNews.length === 0) {
      return {
        finding: makeFinding(
          "news-analyst",
          "No headlines available for analysis.",
          "done",
          [],
          {
            headline: `No recent headlines for ${ticker} or its sector.`,
            signal: "NEUTRAL",
            bullets: ["Both company and sector news feeds returned empty."],
          }
        ),
        events: [],
      };
    }

    const system = `You are the News Analyst agent. You scan ticker and sector news for events that materially affect a multi-year thesis for a long-term, buy-and-hold investor. You filter aggressively — keep only events that could change the long-term view. You do not invent events.

You MUST respond with a JSON array (and nothing else) of up to 8 events. Each event:
{ "title": "...", "source": "...", "url": "...", "scope": "company" | "sector", "impact": "positive" | "neutral" | "negative", "rationale": "<one line, under 15 words, plain English>" }

Use ONLY items from the provided headline lists. Copy the title and source verbatim. If a url is given, copy it. Sort the array by descending impact magnitude (positive/negative before neutral).`;

    const user = `Ticker: ${ticker}${
      sector ? `\nSector: ${sector}` : ""
    }${sectorEtf ? `\nSector ETF (proxy for sector news): ${sectorEtf}` : ""}\n\nCompany headlines (last 7 days):\n${
      companyNews.length ? compactHeadlines(companyNews) : "(none)"
    }\n\nSector headlines (last 7 days):\n${
      sectorNews.length ? compactHeadlines(sectorNews) : "(none)"
    }\n\nReturn the JSON array. Do not wrap in markdown.`;

    const raw = await callClaude(system, user, 1200);
    const events = parseNewsEventsResponse(raw);

    const positive = events.filter((e) => e.impact === "positive").length;
    const negative = events.filter((e) => e.impact === "negative").length;
    const signal: AgentSignal =
      positive > negative ? "BULLISH" : negative > positive ? "BEARISH" : "NEUTRAL";
    const headline = events.length
      ? `${events.length} thesis-relevant events — ${positive}+ / ${negative}- / ${
          events.length - positive - negative
        }=`
      : `No thesis-relevant events surfaced for ${ticker}.`;
    const bullets = events.slice(0, 3).map((e) => {
      const sign = e.impact === "positive" ? "+" : e.impact === "negative" ? "−" : "•";
      return `${sign} ${e.title.slice(0, 90)}${e.title.length > 90 ? "…" : ""}`;
    });

    return {
      finding: makeFinding(
        "news-analyst",
        raw,
        "done",
        { companyNewsCount: companyNews.length, sectorNewsCount: sectorNews.length },
        { headline, signal, bullets: bullets.length ? bullets : undefined }
      ),
      events,
    };
  } catch (e: any) {
    return {
      finding: {
        ...makeFinding("news-analyst", "News analysis unavailable.", "error"),
        error: e?.message ?? "error",
      },
      events: [],
    };
  }
}

async function runPredictionMarkets(symbol: string): Promise<AgentFinding> {
  try {
    const signals = await scanPMIForTicker(symbol);
    if (!signals.length) {
      return makeFinding(
        "predmkt-agent",
        `No related prediction markets surfaced for ${symbol}. Either the asset has no active macro/company markets, or PMI scanner returned empty.`,
        "done",
        [],
        {
          headline: `No prediction markets surfaced for ${symbol}.`,
          signal: "NEUTRAL",
          bullets: ["PMI scanner returned no matches in the spiking-markets feed."],
        }
      );
    }
    const system = `You are the Prediction Markets agent. You scan Polymarket, Kalshi, and Manifold for markets relevant to a specific ticker or asset and report what the crowd is pricing.`;
    const trimmed = signals.slice(0, 8).map((m: any) => ({
      title: m.title ?? m.question ?? m.name ?? "",
      yes: m.yes_probability ?? m.probability ?? m.yes ?? null,
      volume: m.volume_24h ?? m.volume ?? null,
      platform: m.platform ?? m.source ?? "",
    }));
    const user = `Ticker: ${symbol}\n\nLive prediction markets snapshot:\n${JSON.stringify(
      trimmed,
      null,
      2
    )}\n\nExplain what these markets imply about ${symbol} or its macro context. Skip markets that aren't relevant. Use SIGNAL to reflect what the crowd's prices imply for ${symbol} (BULLISH if pricing favorable, BEARISH if unfavorable, NEUTRAL otherwise).${STRUCTURED_FORMAT}`;
    const summary = await callClaude(system, user, 600);
    const parsed = parseAgentResponse(summary);
    return makeFinding("predmkt-agent", summary, "done", signals, parsed);
  } catch (e: any) {
    return {
      ...makeFinding("predmkt-agent", "Prediction markets unavailable.", "error"),
      error: e?.message ?? "error",
    };
  }
}

async function coingecko<T = any>(path: string): Promise<T> {
  const res = await fetch(`/api/coingecko?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  return res.json();
}

type LiveCoin = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  fully_diluted_valuation?: number | null;
  total_volume?: number | null;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h?: number;
  price_change_percentage_7d_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
};

function computeCryptoMetrics(live: LiveCoin): CryptoMetrics {
  const mc = live.market_cap ?? null;
  const fdv = live.fully_diluted_valuation ?? null;
  const vol = live.total_volume ?? null;
  return {
    marketCap: mc,
    fullyDilutedValuation: fdv,
    fdvOverMc: fdv && mc ? fdv / mc : null,
    totalVolume24h: vol,
    volumeOverMc: vol && mc ? vol / mc : null,
  };
}

async function fetchCoinGeckoCoin(symbol: string): Promise<LiveCoin | null> {
  const s = symbol.toLowerCase();
  try {
    const search = await coingecko<{ coins?: { id: string; symbol: string }[] }>(
      `/search?query=${encodeURIComponent(s)}`
    );
    const match =
      search.coins?.find((c) => c.symbol.toLowerCase() === s) ??
      search.coins?.[0];
    if (!match) return null;
    const markets = await coingecko<LiveCoin[]>(
      `/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
        match.id
      )}&sparkline=true&price_change_percentage=1h,24h,7d`
    );
    return Array.isArray(markets) && markets[0] ? markets[0] : null;
  } catch (e) {
    console.error("[fetchCoinGeckoCoin]", e);
    return null;
  }
}

async function runCryptoIntelligence(symbol: string): Promise<{
  finding: AgentFinding;
  priceData: CryptoResearchResult["priceData"];
  metrics: CryptoMetrics;
}> {
  // Always prefer live CoinGecko data. Fall back to the seeded snapshot
  // only if the API is unreachable — seeds are months stale.
  const live = await fetchCoinGeckoCoin(symbol);
  const seeded = live ? null : findCoinBySymbol(symbol);

  const priceData = live
    ? {
        price: live.current_price,
        change24h: live.price_change_percentage_24h ?? 0,
        marketCap: live.market_cap ?? 0,
        sparkline: live.sparkline_in_7d?.price ?? [],
      }
    : seeded
    ? {
        price: seeded.current_price,
        change24h: seeded.price_change_percentage_24h,
        marketCap: 0,
        sparkline: seeded.sparkline_in_7d.price,
      }
    : { price: 0, change24h: 0, marketCap: 0, sparkline: [] };

  try {
    const ctx = live
      ? `${live.name} (${live.symbol.toUpperCase()})\nPrice: $${live.current_price}\nMarket cap: $${(
          (live.market_cap ?? 0) / 1e9
        ).toFixed(2)}B\n1h: ${live.price_change_percentage_1h_in_currency?.toFixed(
          2
        )}%, 24h: ${live.price_change_percentage_24h?.toFixed(
          2
        )}%, 7d: ${live.price_change_percentage_7d_in_currency?.toFixed(2)}%`
      : seeded
      ? `${seeded.name} (${seeded.symbol.toUpperCase()}) — STALE SEEDED DATA (CoinGecko fetch failed)\nPrice: $${seeded.current_price}\n1h: ${seeded.price_change_percentage_1h_in_currency?.toFixed(
          2
        )}%, 24h: ${seeded.price_change_percentage_24h?.toFixed(
          2
        )}%, 7d: ${seeded.price_change_percentage_7d_in_currency?.toFixed(2)}%`
      : `Symbol: ${symbol} — no CoinGecko match. Likely a very new or obscure token; infer general context cautiously and flag the data gap.`;
    const market = `BTC dom ${LIVE_DATA.global.btc_dominance.toFixed(
      1
    )}% · Total cap ${(LIVE_DATA.global.total_market_cap_usd / 1e12).toFixed(
      2
    )}T (24h ${LIVE_DATA.global.market_cap_change_24h.toFixed(2)}%)`;
    const system = `You are the Crypto Intelligence agent. You combine price action, dominance shifts, and broader crypto narratives into a clear read for a long-term crypto investor.`;
    const user = `Asset: ${symbol}\n\nLive snapshot:\n${ctx}\n\nMarket context: ${market}\n\nCover: multi-week trend direction, notable strength or weakness vs the broader crypto market, and one thing to watch for the long-term thesis.${STRUCTURED_FORMAT}`;
    const summary = await callClaude(system, user, 600);
    const parsed = parseAgentResponse(summary);
    const metrics: CryptoMetrics = live ? computeCryptoMetrics(live) : {};
    return {
      finding: makeFinding(
        "coingecko-agent",
        summary,
        "done",
        live ?? seeded,
        parsed
      ),
      priceData,
      metrics,
    };
  } catch (e: any) {
    return {
      finding: {
        ...makeFinding(
          "coingecko-agent",
          "Crypto snapshot unavailable.",
          "error"
        ),
        error: e?.message ?? "error",
      },
      priceData,
      metrics: live ? computeCryptoMetrics(live) : {},
    };
  }
}

async function runIntelligenceHubStock(
  ticker: string,
  quote: Quote,
  findings: AgentFinding[],
  metrics?: ValuationMetrics,
  positionBlock?: string
): Promise<Verdict> {
  const findingsText = findings
    .filter((f) => f.status === "done")
    .map((f) => `### ${f.agentName}\n${f.summary}`)
    .join("\n\n");

  const metricsBlock =
    metrics && Object.values(metrics).some((v) => v != null)
      ? `\n\nValuation snapshot:\n${formatMetricsBlock(
          metrics
        )}\n\nConsider whether the current price is reasonable for a long-term buy-and-hold investor when forming the rating.`
      : "";

  const ownership = positionBlock ? `\n\n${positionBlock}` : "";

  const system = `You are the Intelligence Hub. You synthesize all agent findings into a single, decisive verdict for a long-term, buy-and-hold equity investor.\n\nYou MUST respond with a JSON object only, no prose around it. Schema:\n{ "rating": "STRONG BUY" | "BUY" | "HOLD" | "AVOID", "confidence": "HIGH" | "MEDIUM" | "LOW", "summary": "3-4 sentence thesis" }`;
  const user = `Ticker: ${ticker}\nLast price: $${quote.price.toFixed(
    2
  )} (${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%)${metricsBlock}${ownership}\n\nAgent findings:\n${findingsText}\n\nReturn the JSON verdict. Do not wrap in markdown.`;
  try {
    const raw = await callClaude(system, user, 700);
    return parseVerdict(raw);
  } catch {
    return {
      rating: "HOLD",
      confidence: "LOW",
      summary: `Could not synthesize a verdict for ${ticker}. Inspect agent findings individually.`,
    };
  }
}

async function runIntelligenceHubCrypto(
  symbol: string,
  findings: AgentFinding[]
): Promise<Verdict> {
  const findingsText = findings
    .filter((f) => f.status === "done")
    .map((f) => `### ${f.agentName}\n${f.summary}`)
    .join("\n\n");
  const system = `You are the Intelligence Hub for crypto research. You synthesize agent findings into a decisive verdict for a long-term crypto investor.\n\nRespond with a single JSON object, no prose around it:\n{ "rating": "STRONG BUY" | "BUY" | "HOLD" | "AVOID", "confidence": "HIGH" | "MEDIUM" | "LOW", "summary": "3-4 sentence thesis" }`;
  const user = `Symbol: ${symbol}\n\nAgent findings:\n${findingsText}\n\nReturn the JSON verdict.`;
  try {
    const raw = await callClaude(system, user, 700);
    return parseVerdict(raw);
  } catch {
    return {
      rating: "HOLD",
      confidence: "LOW",
      summary: `Could not synthesize a verdict for ${symbol}.`,
    };
  }
}

function parseVerdict(raw: string): Verdict {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/, "")
    .replace(/```$/, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no json");
  const parsed = JSON.parse(match[0]) as Verdict;
  if (!parsed.rating || !parsed.confidence || !parsed.summary) {
    throw new Error("malformed verdict");
  }
  return parsed;
}

// ---------- Public orchestrator ----------

export async function runStockResearch(
  ticker: string,
  opts: { force?: boolean; onProgress?: ProgressFn } = {}
): Promise<StockResearchResult> {
  const key = ticker.toUpperCase();
  // Position-aware verdicts shouldn't be served from (or saved to) the bare
  // ticker cache — same NVDA query produces different verdicts when held vs not.
  const holding = getHolding(key);
  if (!opts.force && !holding) {
    const cached = getCached<StockResearchResult>(key);
    if (cached) return cached;
  }

  const progress = opts.onProgress ?? (() => {});
  progress("earnings-reviewer", "running");
  progress("market-researcher", "running");
  progress("valuation-reviewer", "running");
  progress("news-analyst", "running");

  // Metrics fetch only gates the Valuation agent — Earnings + Market run
  // independently in parallel.
  const metricsPromise = fetchValuationMetrics(key);
  const valuationPromise = metricsPromise.then((m) =>
    runValuationReviewer(key, m).then((f) => {
      progress("valuation-reviewer", f.status, f);
      return f;
    })
  );

  // News Analyst chains: profile lookup → sector ETF → news fetches → Claude.
  // Whole pipeline still runs in parallel with the other agents.
  const newsPromise = (async () => {
    const profile = await fetchCompanyProfile(key);
    const sectorEtf = resolveSectorEtf(profile?.sector);
    const [companyNews, sectorNews] = await Promise.all([
      fetchCompanyNews(key, 7),
      sectorEtf ? fetchCompanyNews(sectorEtf, 7) : Promise.resolve([] as any[]),
    ]);
    const r = await runNewsAnalyst(
      key,
      profile?.sector ?? null,
      companyNews,
      sectorNews,
      sectorEtf
    );
    progress("news-analyst", r.finding.status, r.finding);
    return { ...r, sectorEtf };
  })();

  const [quote, earnings, market, metrics, valuation, news] = await Promise.all([
    fetchFinnhubQuote(key).catch(() => ({ price: 0, change: 0, changePct: 0 })),
    runEarningsReviewer(key).then((f) => {
      progress("earnings-reviewer", f.status, f);
      return f;
    }),
    runMarketResearcher(key).then((f) => {
      progress("market-researcher", f.status, f);
      return f;
    }),
    metricsPromise,
    valuationPromise,
    newsPromise,
  ]);

  const findings: AgentFinding[] = [earnings, market, valuation, news.finding];

  // Build the optional position context for the Hub.
  let positionBlock: string | undefined;
  if (holding && quote.price > 0) {
    const totalCost = holding.shares * holding.costBasis;
    const marketValue = holding.shares * quote.price;
    const pnl = marketValue - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
    positionBlock =
      `Your position: ${holding.shares} shares at $${holding.costBasis.toFixed(
        2
      )}/share cost basis ($${totalCost.toFixed(
        2
      )} total). Current value $${marketValue.toFixed(2)} = P/L ${
        pnl >= 0 ? "+" : ""
      }$${pnl.toFixed(2)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(
        2
      )}%).\n\nFrame the rating as a hold / add / trim decision for a long-term buy-and-hold investor — not as an abstract take. STRONG BUY = add to the position, BUY = lean positive but no urgent action, HOLD = continue holding, AVOID = trim or exit. Consider whether the long-term thesis still warrants the position at the current price.`;
  }

  // Append a compact events block to the position context so the Hub anchors
  // on actual headlines, not just narrative. Stays small to keep the prompt cheap.
  let hubContext = positionBlock;
  if (news.events.length > 0) {
    const eventsLine = news.events
      .slice(0, 6)
      .map((e) => {
        const sign =
          e.impact === "positive" ? "+" : e.impact === "negative" ? "-" : "•";
        return `[${sign}] (${e.scope}) ${e.title} — ${e.rationale}`;
      })
      .join("\n");
    const block = `Recent key events:\n${eventsLine}`;
    hubContext = hubContext ? `${hubContext}\n\n${block}` : block;
  }

  progress("intel-hub", "running");
  const verdict = await runIntelligenceHubStock(
    key,
    quote,
    findings,
    metrics,
    hubContext
  );
  const hubFinding = makeFinding("intel-hub", verdict.summary, "done", verdict);
  progress("intel-hub", "done", hubFinding);
  findings.push(hubFinding);

  const result: StockResearchResult = {
    ticker: key,
    quote,
    verdict,
    findings,
    metrics,
    newsEvents: news.events,
    sectorEtf: news.sectorEtf,
    cachedAt: Date.now(),
  };
  // Don't cache position-aware verdicts under the bare ticker key.
  if (!holding) setCache(key, result);
  return result;
}

export async function runCryptoResearch(
  symbol: string,
  opts: { force?: boolean; onProgress?: ProgressFn } = {}
): Promise<CryptoResearchResult> {
  const key = `crypto:${symbol.toUpperCase()}`;
  if (!opts.force) {
    const cached = getCached<CryptoResearchResult>(key);
    if (cached) return cached;
  }

  const progress = opts.onProgress ?? (() => {});
  progress("coingecko-agent", "running");

  const {
    finding: cryptoFinding,
    priceData,
    metrics,
  } = await runCryptoIntelligence(symbol).then((r) => {
    progress("coingecko-agent", r.finding.status, r.finding);
    return r;
  });

  const findings: AgentFinding[] = [cryptoFinding];

  progress("intel-hub", "running");
  const verdict = await runIntelligenceHubCrypto(symbol, findings);
  const hubFinding = makeFinding("intel-hub", verdict.summary, "done", verdict);
  progress("intel-hub", "done", hubFinding);
  findings.push(hubFinding);

  const result: CryptoResearchResult = {
    symbol: symbol.toUpperCase(),
    priceData,
    metrics,
    verdict,
    findings,
    cachedAt: Date.now(),
  };
  setCache(key, result);
  return result;
}

// ---------- Manually triggered single-agent runs ----------

export async function runAgentManually(
  slug: string,
  asset: string,
  mode: "stocks" | "crypto"
): Promise<AgentFinding> {
  switch (slug) {
    case "earnings-reviewer":
      return runEarningsReviewer(asset);
    case "market-researcher":
      return runMarketResearcher(asset);
    case "predmkt-agent":
      return runPredictionMarkets(asset);
    case "coingecko-agent":
      return (await runCryptoIntelligence(asset)).finding;
    default: {
      const agent = getAgent(slug);
      if (!agent) {
        return makeFinding(slug, `Unknown agent: ${slug}`, "error");
      }
      try {
        const system = `You are the ${agent.name} agent. ${agent.description}`;
        const user = `${mode === "crypto" ? "Symbol" : "Ticker"}: ${asset}\n\nProduce a 3-4 sentence finding tailored to a long-term ${
          mode === "crypto" ? "crypto" : "equity"
        } investor. Highlight one concrete data point and one thing to watch.`;
        const summary = await callClaude(system, user, 600);
        return makeFinding(slug, summary, "done");
      } catch (e: any) {
        return {
          ...makeFinding(slug, "Agent run failed.", "error"),
          error: e?.message ?? "error",
        };
      }
    }
  }
}
