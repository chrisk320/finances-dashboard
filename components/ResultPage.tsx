"use client";

import { useEffect, useMemo, useState } from "react";
import AgentFindingCard from "./AgentFindingCard";
import NewsEventsPanel from "./NewsEventsPanel";
import PositionPanel from "./PositionPanel";
import Sparkline from "./Sparkline";
import ValuationPanel from "./ValuationPanel";
import VerdictCard from "./VerdictCard";
import { AGENTS } from "@/lib/agents";
import { cacheTtlMs } from "@/lib/orchestrator";
import { fmtPrice, pct, pctColor, timeUntil } from "@/lib/format";
import { isWatched, markSeen, toggleWatch } from "@/lib/watchlist";
import type {
  AgentFinding,
  AssetMode,
  CryptoResearchResult,
  StockResearchResult,
} from "@/lib/types";

type Props = {
  mode: AssetMode;
  symbol: string;
  result: StockResearchResult | CryptoResearchResult | null;
  liveFindings: AgentFinding[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onRunAgent: (slug: string) => void;
};

const AUTO_STOCK = new Set([
  "earnings-reviewer",
  "market-researcher",
  "valuation-reviewer",
  "news-analyst",
  "intel-hub",
]);
const AUTO_CRYPTO = new Set(["coingecko-agent", "intel-hub"]);

// Agents whose findings live in a dedicated panel rather than the agent grid.
// intel-hub already powers the top VerdictCard; news-analyst feeds NewsEventsPanel.
const NON_GRID_AGENTS = new Set(["intel-hub", "news-analyst"]);

export default function ResultPage({
  mode,
  symbol,
  result,
  liveFindings,
  loading,
  error,
  onRefresh,
  onRunAgent,
}: Props) {
  const findings: AgentFinding[] = useMemo(() => {
    const dropNonGrid = (list: AgentFinding[]) =>
      list.filter((f) => !NON_GRID_AGENTS.has(f.agentSlug));
    if (loading) {
      const seen = new Set<string>();
      const merged: AgentFinding[] = [];
      for (const f of liveFindings) {
        if (seen.has(f.agentSlug)) continue;
        seen.add(f.agentSlug);
        merged.push(f);
      }
      return dropNonGrid(merged);
    }
    return dropNonGrid(result?.findings ?? liveFindings);
  }, [loading, liveFindings, result]);

  const verdict = result?.verdict ?? null;
  const autoSet = mode === "crypto" ? AUTO_CRYPTO : AUTO_STOCK;
  const idleAgents = AGENTS.filter((a) => {
    if (autoSet.has(a.slug)) return false;
    if (findings.some((f) => f.agentSlug === a.slug)) return false;
    return true;
  });

  const isCrypto = mode === "crypto";
  const cryptoResult = isCrypto ? (result as CryptoResearchResult | null) : null;
  const stockResult = !isCrypto ? (result as StockResearchResult | null) : null;

  const price = isCrypto
    ? cryptoResult?.priceData.price ?? 0
    : stockResult?.quote.price ?? 0;
  const changePct = isCrypto
    ? cryptoResult?.priceData.change24h ?? 0
    : stockResult?.quote.changePct ?? 0;
  const sparkline = isCrypto ? cryptoResult?.priceData.sparkline : undefined;

  const cachedAt = result?.cachedAt;
  const refreshesIn = cachedAt ? timeUntil(cachedAt + cacheTtlMs) : null;

  const [watched, setWatched] = useState(false);
  useEffect(() => {
    setWatched(isWatched(symbol, mode));
  }, [symbol, mode]);

  // Once a verdict is rendered, mark the row as seen so the watchlist delta
  // badge clears on view.
  useEffect(() => {
    if (verdict) {
      markSeen(symbol, mode);
      window.dispatchEvent(new Event("watchlist:change"));
    }
  }, [verdict, symbol, mode]);

  function onToggleStar() {
    const next = toggleWatch(symbol, mode);
    setWatched(next);
    window.dispatchEvent(new Event("watchlist:change"));
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-mono font-bold tracking-wide text-text-primary">
              {symbol}
            </h1>
            <button
              onClick={onToggleStar}
              aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
              title={watched ? "Remove from watchlist" : "Add to watchlist"}
              className="text-[18px] leading-none transition-colors"
              style={{ color: watched ? "#fbbf24" : "#4a5170" }}
            >
              {watched ? "★" : "☆"}
            </button>
            <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-text-muted">
              {isCrypto ? "Crypto" : "Equity"}
            </span>
          </div>
          {price > 0 && (
            <div className="flex flex-col gap-0.5 mt-1">
              <div className="flex items-center gap-3">
                <span className="text-[18px] font-mono text-text-primary">
                  {fmtPrice(price)}
                </span>
                <span
                  className="text-[13px] font-mono"
                  style={{ color: pctColor(changePct) }}
                >
                  {pct(changePct)}
                </span>
                {sparkline && sparkline.length > 1 && (
                  <Sparkline
                    data={sparkline}
                    color={pctColor(changePct)}
                    width={120}
                    height={30}
                  />
                )}
              </div>
              {!isCrypto && (
                <span className="text-[10px] uppercase tracking-[0.12em] text-text-dim font-mono">
                  Regular session · Finnhub free tier (no after-hours / pre-market)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          {cachedAt && refreshesIn && (
            <span className="text-text-muted">
              cached · refreshes in {refreshesIn}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-card rounded-md px-3 py-1.5 disabled:opacity-50 transition-colors"
          >
            {loading ? "Running…" : "↺ Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-[#2a0d0d] border border-[#f8717155] rounded-lg px-4 py-3 text-[12px] text-[#fca5a5] font-mono">
          {error}
        </div>
      )}

      {!isCrypto && (
        <PositionPanel symbol={symbol} currentPrice={price} />
      )}

      {verdict && <VerdictCard verdict={verdict} />}

      {loading && !verdict && (
        <div className="bg-bg-card border border-border rounded-xl px-5 py-4">
          <div className="text-[11px] uppercase tracking-[0.12em] text-text-dim font-mono mb-1">
            Intelligence Hub
          </div>
          <div className="text-text-secondary text-[13px]">
            Synthesizing verdict from agent findings…
          </div>
        </div>
      )}

      <ValuationPanel mode={mode} metrics={result?.metrics} />

      {!isCrypto && (
        <NewsEventsPanel
          events={(result as StockResearchResult | null)?.newsEvents}
          sectorEtf={(result as StockResearchResult | null)?.sectorEtf ?? null}
        />
      )}

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-3">
          Agent findings
        </h2>
        {findings.length === 0 ? (
          <div className="text-text-muted text-[12px] font-mono">
            No findings yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {findings.map((f) => (
              <AgentFindingCard key={f.agentSlug} finding={f} />
            ))}
          </div>
        )}
      </section>

      {idleAgents.length > 0 && (
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-3">
            Idle agents
          </h2>
          <div className="flex flex-wrap gap-2">
            {idleAgents.map((agent) => (
              <button
                key={agent.slug}
                onClick={() => onRunAgent(agent.slug)}
                style={{
                  borderColor: `${agent.color}55`,
                  color: agent.color,
                }}
                className="bg-bg-card border rounded-full px-3 py-1.5 text-[11px] font-mono hover:bg-[#15182a] transition-colors"
              >
                + {agent.name}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
