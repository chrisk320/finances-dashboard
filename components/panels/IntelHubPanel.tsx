"use client";

import { useEffect, useState } from "react";
import type { Agent } from "@/lib/types";

const WATCHLIST = ["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN", "META", "BRK.B", "JPM", "V", "UNH"];

type Quote = { c?: number; d?: number; dp?: number };
type Earning = { symbol: string; date: string; epsEstimate?: number; revenueEstimate?: number };
type News = { headline: string; source: string; url?: string };

async function finnhub<T = any>(path: string): Promise<T> {
  const res = await fetch(`/api/finnhub?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`finnhub ${res.status}`);
  return res.json();
}

async function pmi(agent_id: number, params: Record<string, any>, limit = 10) {
  try {
    const res = await fetch("/api/pmi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id, params, limit }),
    });
    if (!res.ok) return [];
    const d = await res.json();
    return d?.data?.results ?? d?.results ?? [];
  } catch {
    return [];
  }
}

function buildSystem(blocks: {
  stocks: string;
  earnings: string;
  news: string;
  pmi: string;
  crypto: string;
}) {
  return `You are a daily briefing agent for a long-term, buy-and-hold equity investor. Surface what matters TODAY for someone thinking in years.

Investor profile: Long-term / buy-and-hold equity investor.

## Live Data

### Watchlist (Finnhub)
${blocks.stocks}

### Earnings This Week
${blocks.earnings}

### Market News
${blocks.news}

### Macro Prediction Markets (Heisenberg PMI)
${blocks.pmi}

### Crypto Risk Barometer
${blocks.crypto}

## Principles
- Filter out short-term noise. Flag only what affects multi-year theses or creates meaningful entry opportunities.
- Be direct: if conditions don't warrant action, say "hold and wait".
- Always include what could go wrong.
- Not financial advice.`;
}

export default function IntelHubPanel({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"briefing" | "dive">("briefing");
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [stocks, setStocks] = useState<{ ticker: string; q: Quote }[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [pmiContext, setPmiContext] = useState("");
  const [dataStatus, setDataStatus] = useState<"loading" | "ready" | "error">("loading");
  const [diveInput, setDiveInput] = useState("");
  const [diveResult, setDiveResult] = useState<string | null>(null);
  const [diveLoading, setDiveLoading] = useState(false);

  useEffect(() => {
    void fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAllData() {
    setDataStatus("loading");
    try {
      const quotes = await Promise.all(
        WATCHLIST.map((t) =>
          finnhub<Quote>(`/quote?symbol=${t}`)
            .then((q) => ({ ticker: t, q }))
            .catch(() => null)
        )
      );
      setStocks(quotes.filter((x): x is { ticker: string; q: Quote } => Boolean(x)));

      const today = new Date();
      const from = today.toISOString().slice(0, 10);
      const to = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
      try {
        const cal = await finnhub<{ earningsCalendar?: Earning[] }>(
          `/calendar/earnings?from=${from}&to=${to}`
        );
        setEarnings((cal.earningsCalendar ?? []).slice(0, 15));
      } catch {
        setEarnings([]);
      }

      try {
        const mn = await finnhub<News[]>(`/market-news?category=general`);
        setNews((mn ?? []).slice(0, 8));
      } catch {
        setNews([]);
      }

      try {
        const [mkts, wallets] = await Promise.all([
          pmi(575, { min_volume_24h: "50000", volume_trend: "Spiking" }, 5),
          pmi(584, { min_pnl_15d: "1000", sort_by: "h_score" }, 3),
        ]);
        const macro = mkts.filter((m: any) =>
          /fed|rate|cpi|inflation|recession|gdp|employment/i.test(m.question ?? "")
        );
        const picks = (macro.length ? macro : mkts).slice(0, 3);
        const mktStr = picks
          .map(
            (m: any) =>
              `- "${m.question}" | ${m.winning_side ?? "?"} winning | Vol: $${(
                Number(m.current_volume_24h ?? 0) / 1e6
              ).toFixed(1)}M 24h`
          )
          .join("\n");
        const top = wallets[0] as any;
        setPmiContext(
          `${mktStr}\nTop wallet H-Score: ${top?.h_score ?? "N/A"} | 15d PnL: $${Number(
            top?.total_pnl_15d ?? 0
          ).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        );
      } catch {
        setPmiContext("PMI data unavailable.");
      }

      setDataStatus("ready");
    } catch {
      setDataStatus("error");
    }
  }

  function buildContextBlocks() {
    const stockStr =
      stocks
        .map(({ ticker, q }) => {
          const chg = q.dp != null ? `${q.dp > 0 ? "+" : ""}${q.dp.toFixed(2)}%` : "N/A";
          return `${ticker}: $${q.c?.toFixed(2) ?? "N/A"} (${chg})`;
        })
        .join(", ") || "Stock data unavailable";

    const earningsStr = earnings.length
      ? earnings
          .map(
            (e) =>
              `${e.symbol} | ${e.date} | EPS est: ${e.epsEstimate ?? "N/A"} | Rev est: ${
                e.revenueEstimate
                  ? `$${(e.revenueEstimate / 1e9).toFixed(1)}B`
                  : "N/A"
              }`
          )
          .join("\n")
      : "No major earnings this week";

    const newsStr = news.length
      ? news.map((n) => `- ${n.headline} [${n.source}]`).join("\n")
      : "No news available";

    return {
      stocks: stockStr,
      earnings: earningsStr,
      news: newsStr,
      pmi: pmiContext || "(loading)",
      crypto:
        "BTC $80,691 (-1.0% 24h) | ETH $2,284 (-2.1%) | BTC dominance 58.3% — mild risk-off tone in crypto",
    };
  }

  async function generateBriefing() {
    if (briefingLoading) return;
    setBriefingLoading(true);
    setBriefing(null);
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystem(buildContextBlocks()),
          messages: [
            {
              role: "user",
              content: `Generate my daily briefing for ${today}. Format exactly as:

**MACRO ENVIRONMENT** — 2-3 sentences. Deploy / hold / wait based on macro?

**EARNINGS THIS WEEK — WHAT TO WATCH** — flag any reports that matter to a long-term thesis.

**MARKET NEWS THAT MATTERS** — 2-3 bullets, only multi-year-relevant items.

**WATCHLIST CHECK-IN** — from ${WATCHLIST.join(
                ", "
              )}, flag meaningful moves (dip = entry, run = extended). Skip flat ones.

**THIS WEEK'S LONG-TERM OPPORTUNITY** — one specific actionable idea, thesis + key risk.

**HOLD AND WAIT RATING** — DEPLOY CAPITAL / HOLD CURRENT POSITIONS / WAIT FOR BETTER PRICES with one-sentence reason.

Be direct. Not financial advice.`,
            },
          ],
          max_tokens: 1800,
        }),
      });
      const data = await res.json();
      const text =
        data.content?.find((b: any) => b.type === "text")?.text ?? "Error.";
      setBriefing(text);
    } catch {
      setBriefing("Error connecting to Claude API.");
    }
    setBriefingLoading(false);
  }

  async function runDive() {
    const t = diveInput.trim().toUpperCase();
    if (!t || diveLoading) return;
    setDiveLoading(true);
    setDiveResult(null);
    try {
      const [quote, companyNews] = await Promise.all([
        finnhub<Quote>(`/quote?symbol=${t}`).catch(() => ({} as Quote)),
        finnhub<any[]>(
          `/company-news?symbol=${t}&from=${
            new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
          }&to=${new Date().toISOString().slice(0, 10)}`
        ).catch(() => []),
      ]);
      const headlines = (companyNews ?? [])
        .slice(0, 10)
        .map((n: any) => `- ${n.headline} [${n.source}]`)
        .join("\n");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are the Intelligence Hub. Provide a focused deep-dive for a long-term, buy-and-hold equity investor. Format:
**THESIS (1-3y)**
**BULLISH FACTORS** (3 bullets)
**RISKS** (3 bullets)
**ENTRY VERDICT** — BUY NOW / WAIT FOR DIP / AVOID + 1 sentence.

Not financial advice.`,
          messages: [
            {
              role: "user",
              content: `Ticker: ${t}\nPrice: $${quote.c?.toFixed(2) ?? "N/A"} (${
                quote.dp != null ? `${quote.dp > 0 ? "+" : ""}${quote.dp.toFixed(2)}%` : "N/A"
              })\n\nRecent headlines:\n${headlines || "(none)"}`,
            },
          ],
          max_tokens: 1400,
        }),
      });
      const data = await res.json();
      setDiveResult(
        data.content?.find((b: any) => b.type === "text")?.text ?? "Error."
      );
    } catch {
      setDiveResult("Error running deep-dive.");
    }
    setDiveLoading(false);
  }

  return (
    <div
      style={{
        background: "#0b0d14",
        border: "1px solid #E879F944",
        borderRadius: 16,
      }}
      className="h-full flex flex-col overflow-hidden"
    >
      <div className="px-6 pt-6 border-b border-border">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#E879F922] border border-[#E879F944] flex items-center justify-center text-2xl">
              🧠
            </div>
            <div>
              <div className="text-text-primary text-lg font-mono font-bold">
                Intelligence Hub
              </div>
              <div className="text-text-muted text-[11px] font-mono mt-0.5">
                Synthesis · long-term · buy &amp; hold
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="border border-border-subtle text-text-secondary w-8 h-8 rounded-lg text-base hover:bg-bg-card"
          >
            ✕
          </button>
        </div>
        <div className="flex">
          {(["briefing", "dive"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                borderBottom: tab === t ? "2px solid #E879F9" : "2px solid transparent",
                color: tab === t ? "#E879F9" : "#4a5170",
              }}
              className="px-4 py-2 text-xs font-mono uppercase tracking-[0.08em]"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {tab === "briefing" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-text-muted">
                Data: {dataStatus === "ready" ? "✓ ready" : dataStatus === "loading" ? "loading…" : "error"}
              </span>
              <span className="text-text-dim">
                {stocks.length} quotes · {earnings.length} earnings · {news.length} headlines
              </span>
              <button
                onClick={generateBriefing}
                disabled={dataStatus !== "ready" || briefingLoading}
                className="ml-auto bg-[#E879F9] text-[#0b0d14] font-bold px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                {briefingLoading ? "Generating…" : "Generate briefing"}
              </button>
            </div>
            {briefing && (
              <div className="bg-bg-card border border-[#E879F944] rounded-xl p-4 text-[12.5px] leading-relaxed text-[#c0cce0] whitespace-pre-wrap">
                {briefing}
              </div>
            )}
            {!briefing && !briefingLoading && (
              <div className="text-text-muted text-[12px] font-mono">
                Click <em>Generate briefing</em> for today's long-term-investor digest.
              </div>
            )}
          </div>
        )}

        {tab === "dive" && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={diveInput}
                onChange={(e) => setDiveInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && runDive()}
                placeholder="Ticker (e.g. NVDA)"
                className="flex-1 bg-bg-card border border-[#1e2130] rounded-lg px-3.5 py-2.5 text-[#c0cce0] text-[12px] font-mono outline-none focus:border-text-muted"
              />
              <button
                onClick={runDive}
                disabled={diveLoading || !diveInput.trim()}
                style={{ background: diveLoading ? "#1a1d2e" : "#E879F9" }}
                className="rounded-lg px-4 py-2.5 text-[#0b0d14] text-[12px] font-mono font-bold disabled:cursor-not-allowed"
              >
                Dive
              </button>
            </div>
            {diveResult && (
              <div className="bg-bg-card border border-[#E879F944] rounded-xl p-4 text-[12.5px] leading-relaxed text-[#c0cce0] whitespace-pre-wrap">
                {diveResult}
              </div>
            )}
            {!diveResult && !diveLoading && (
              <div className="text-text-muted text-[12px] font-mono">
                Enter a ticker for a focused long-term deep-dive.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
