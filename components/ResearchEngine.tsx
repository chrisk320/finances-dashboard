"use client";

import { useCallback, useEffect, useState } from "react";
import AgentsGrid from "./AgentsGrid";
import ResultPage from "./ResultPage";
import SearchSidebar, { pushRecent } from "./SearchSidebar";
import {
  clearCache,
  runAgentManually,
  runCryptoResearch,
  runStockResearch,
} from "@/lib/orchestrator";
import type {
  AgentFinding,
  AgentStatus,
  AssetMode,
  CryptoResearchResult,
  RunStatus,
  StockResearchResult,
} from "@/lib/types";

type Tab = "stocks" | "crypto" | "agents";

export default function ResearchEngine() {
  const [tab, setTab] = useState<Tab>("stocks");
  const [stockSymbol, setStockSymbol] = useState<string | null>(null);
  const [cryptoSymbol, setCryptoSymbol] = useState<string | null>(null);
  const [stockResult, setStockResult] = useState<StockResearchResult | null>(null);
  const [cryptoResult, setCryptoResult] = useState<CryptoResearchResult | null>(null);
  const [status, setStatus] = useState<RunStatus>({});
  const [liveFindings, setLiveFindings] = useState<AgentFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode: AssetMode = tab === "crypto" ? "crypto" : "stocks";
  const currentSymbol = mode === "crypto" ? cryptoSymbol : stockSymbol;
  const currentResult = mode === "crypto" ? cryptoResult : stockResult;

  const runResearch = useCallback(
    async (symbol: string, opts: { force?: boolean } = {}) => {
      setLoading(true);
      setError(null);
      setLiveFindings([]);
      setStatus({});
      if (mode === "crypto") {
        setCryptoSymbol(symbol);
        setCryptoResult(null);
      } else {
        setStockSymbol(symbol);
        setStockResult(null);
      }

      const onProgress = (
        slug: string,
        s: AgentStatus,
        finding?: AgentFinding
      ) => {
        setStatus((prev) => ({ ...prev, [slug]: s }));
        if (finding) {
          setLiveFindings((prev) => {
            const without = prev.filter((f) => f.agentSlug !== finding.agentSlug);
            return [...without, finding];
          });
        }
      };

      try {
        if (mode === "crypto") {
          const res = await runCryptoResearch(symbol, {
            force: opts.force,
            onProgress,
          });
          setCryptoResult(res);
        } else {
          const res = await runStockResearch(symbol, {
            force: opts.force,
            onProgress,
          });
          setStockResult(res);
        }
        pushRecent(symbol, mode);
      } catch (e: any) {
        setError(e?.message ?? "Research failed.");
      } finally {
        setLoading(false);
      }
    },
    [mode]
  );

  const handleSearch = useCallback(
    (symbol: string) => {
      const clean = symbol.trim().toUpperCase();
      if (!clean) return;
      void runResearch(clean);
    },
    [runResearch]
  );

  const handleRefresh = useCallback(() => {
    if (!currentSymbol) return;
    const key = mode === "crypto" ? `crypto:${currentSymbol}` : currentSymbol;
    clearCache(key);
    void runResearch(currentSymbol, { force: true });
  }, [currentSymbol, mode, runResearch]);

  const handleRunAgent = useCallback(
    async (slug: string) => {
      if (!currentSymbol) return;
      setStatus((p) => ({ ...p, [slug]: "running" }));
      setLiveFindings((prev) => [
        ...prev.filter((f) => f.agentSlug !== slug),
        {
          agentSlug: slug,
          agentName: slug,
          accentColor: "#8b9ab8",
          status: "running",
          summary: "",
        },
      ]);
      try {
        const finding = await runAgentManually(slug, currentSymbol, mode);
        setStatus((p) => ({ ...p, [slug]: finding.status }));
        setLiveFindings((prev) => [
          ...prev.filter((f) => f.agentSlug !== slug),
          finding,
        ]);
        // also patch the result findings so the card sticks
        if (mode === "crypto" && cryptoResult) {
          setCryptoResult({
            ...cryptoResult,
            findings: [
              ...cryptoResult.findings.filter((f) => f.agentSlug !== slug),
              finding,
            ],
          });
        } else if (mode === "stocks" && stockResult) {
          setStockResult({
            ...stockResult,
            findings: [
              ...stockResult.findings.filter((f) => f.agentSlug !== slug),
              finding,
            ],
          });
        }
      } catch (e: any) {
        setStatus((p) => ({ ...p, [slug]: "error" }));
        setError(e?.message ?? "Agent run failed.");
      }
    },
    [currentSymbol, mode, cryptoResult, stockResult]
  );

  // Reset live findings when switching tabs so the sidebar reflects the new mode.
  useEffect(() => {
    setLiveFindings([]);
    setStatus({});
    setError(null);
  }, [tab]);

  return (
    <div className="flex flex-col h-screen bg-bg-page">
      <nav className="flex items-center gap-2 px-6 py-3 border-b border-border bg-bg-panel">
        <div className="text-[13px] font-mono font-bold tracking-wide text-text-primary mr-6">
          ⌁ Research Engine
        </div>
        {(["stocks", "crypto", "agents"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[11px] uppercase tracking-[0.14em] font-mono px-3 py-1.5 rounded-md transition-colors ${
              tab === t
                ? "bg-bg-card text-text-primary border border-border-subtle"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto text-[10px] uppercase tracking-[0.12em] font-mono text-text-dim">
          long-term · buy &amp; hold
        </div>
      </nav>

      {tab === "agents" ? (
        <AgentsGrid />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <SearchSidebar
            mode={mode}
            status={status}
            current={currentSymbol}
            onSearch={handleSearch}
          />
          {currentSymbol ? (
            <ResultPage
              mode={mode}
              symbol={currentSymbol}
              result={currentResult}
              liveFindings={liveFindings}
              loading={loading}
              error={error}
              onRefresh={handleRefresh}
              onRunAgent={handleRunAgent}
            />
          ) : (
            <EmptyState mode={mode} />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ mode }: { mode: AssetMode }) {
  const example = mode === "crypto" ? "SOL" : "NVDA";
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div className="text-center max-w-md">
        <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-2">
          {mode === "crypto" ? "Crypto research" : "Equity research"}
        </div>
        <h1 className="text-[26px] font-mono font-bold tracking-wide text-text-primary mb-3">
          Search a {mode === "crypto" ? "token" : "ticker"}
        </h1>
        <p className="text-text-secondary text-[13px] leading-relaxed">
          Type a {mode === "crypto" ? "symbol like " : "ticker like "}
          <span className="font-mono text-text-primary">{example}</span> in the
          sidebar. Agents fire in parallel, then the Intelligence Hub
          synthesizes a long-term verdict.
        </p>
      </div>
    </div>
  );
}
