import { getAgent } from "./agents";
import { findCoinBySymbol, LIVE_DATA } from "./cryptoData";
import type {
  AgentFinding,
  AgentStatus,
  CryptoResearchResult,
  Quote,
  StockResearchResult,
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
  raw?: any
): AgentFinding {
  const agent = getAgent(slug);
  return {
    agentSlug: slug,
    agentName: agent?.name ?? slug,
    accentColor: agent?.color ?? "#8b9ab8",
    status,
    summary,
    raw,
  };
}

async function runEarningsReviewer(ticker: string): Promise<AgentFinding> {
  try {
    const news = await fetchCompanyNews(ticker, 30);
    const headlines = news
      .slice(0, 10)
      .map((n) => `- ${n.headline ?? n.title ?? ""} (${n.source ?? ""})`)
      .join("\n");
    const system = `You are the Earnings Reviewer agent. You analyze recent earnings releases, transcripts, and filings for thesis-relevant signals.`;
    const user = `Ticker: ${ticker}\n\nRecent company news (last 30 days):\n${headlines || "(no news)"}\n\nWrite a 3-4 sentence summary covering:\n- Most recent earnings beat/miss/in-line if known or implied\n- Forward guidance signal\n- One concern and one positive worth tracking\n\nKeep it under 100 words. Cite specific items from the news only if relevant.`;
    const summary = await callClaude(system, user, 600);
    return makeFinding("earnings-reviewer", summary, "done", { news });
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
    const user = `Ticker: ${ticker}\n\nRecent headlines (last 7 days):\n${headlines || "(no news)"}\n\nWrite a 3-4 sentence summary covering:\n- Dominant narrative this week\n- Sector tailwind or headwind\n- Net read for a long-term holder\n\nKeep it under 100 words.`;
    const summary = await callClaude(system, user, 600);
    return makeFinding("market-researcher", summary, "done", { news });
  } catch (e: any) {
    return {
      ...makeFinding("market-researcher", "Market data unavailable.", "error"),
      error: e?.message ?? "error",
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
        []
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
    )}\n\nWrite a 3-4 sentence summary of what these markets imply about ${symbol} or its macro context. Skip markets that aren't relevant. Under 100 words.`;
    const summary = await callClaude(system, user, 600);
    return makeFinding("predmkt-agent", summary, "done", signals);
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
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h?: number;
  price_change_percentage_7d_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
};

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
    const user = `Asset: ${symbol}\n\nLive snapshot:\n${ctx}\n\nMarket context: ${market}\n\nWrite a 3-4 sentence summary covering:\n- Trend direction (multi-week)\n- Notable strength/weakness vs market\n- One thing to watch for the long-term thesis\n\nUnder 100 words.`;
    const summary = await callClaude(system, user, 600);
    return {
      finding: makeFinding("coingecko-agent", summary, "done", live ?? seeded),
      priceData,
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
    };
  }
}

async function runIntelligenceHubStock(
  ticker: string,
  quote: Quote,
  findings: AgentFinding[]
): Promise<Verdict> {
  const findingsText = findings
    .filter((f) => f.status === "done")
    .map((f) => `### ${f.agentName}\n${f.summary}`)
    .join("\n\n");

  const system = `You are the Intelligence Hub. You synthesize all agent findings into a single, decisive verdict for a long-term, buy-and-hold equity investor.\n\nYou MUST respond with a JSON object only, no prose around it. Schema:\n{ "rating": "STRONG BUY" | "BUY" | "HOLD" | "AVOID", "confidence": "HIGH" | "MEDIUM" | "LOW", "summary": "3-4 sentence thesis" }`;
  const user = `Ticker: ${ticker}\nLast price: $${quote.price.toFixed(
    2
  )} (${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%)\n\nAgent findings:\n${findingsText}\n\nReturn the JSON verdict. Do not wrap in markdown.`;
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
  if (!opts.force) {
    const cached = getCached<StockResearchResult>(key);
    if (cached) return cached;
  }

  const progress = opts.onProgress ?? (() => {});
  progress("earnings-reviewer", "running");
  progress("market-researcher", "running");

  const [quote, earnings, market] = await Promise.all([
    fetchFinnhubQuote(key).catch(() => ({ price: 0, change: 0, changePct: 0 })),
    runEarningsReviewer(key).then((f) => {
      progress("earnings-reviewer", f.status, f);
      return f;
    }),
    runMarketResearcher(key).then((f) => {
      progress("market-researcher", f.status, f);
      return f;
    }),
  ]);

  const findings: AgentFinding[] = [earnings, market];

  progress("intel-hub", "running");
  const verdict = await runIntelligenceHubStock(key, quote, findings);
  const hubFinding = makeFinding("intel-hub", verdict.summary, "done", verdict);
  progress("intel-hub", "done", hubFinding);
  findings.push(hubFinding);

  const result: StockResearchResult = {
    ticker: key,
    quote,
    verdict,
    findings,
    cachedAt: Date.now(),
  };
  setCache(key, result);
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

  const { finding: cryptoFinding, priceData } = await runCryptoIntelligence(
    symbol
  ).then((r) => {
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
