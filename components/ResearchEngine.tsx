"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import AgentsGrid from "./AgentsGrid";
import MarketOverview from "./MarketOverview";
import PortfolioView from "./PortfolioView";
import ResultPage from "./ResultPage";
import SearchSidebar, { pushRecent } from "./SearchSidebar";
import {
  cacheTtlMs,
  clearCache,
  runAgentManually,
  runCryptoResearch,
  runStockResearch,
} from "@/lib/orchestrator";
import { loadPortfolio } from "@/lib/portfolio";
import { loadWatchlist, recordVerdict } from "@/lib/watchlist";
import type {
  AgentFinding,
  AgentStatus,
  AssetMode,
  CryptoResearchResult,
  PortfolioHolding,
  RunStatus,
  StockResearchResult,
} from "@/lib/types";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const BACKGROUND_DELAY_MS = 1500;
const MIGRATED_FLAG = "migrated:v1";

type Tab = "markets" | "stocks" | "crypto" | "portfolio" | "agents";

export default function ResearchEngine() {
  const { status: sessionStatus } = useSession();
  const [tab, setTab] = useState<Tab>("markets");
  const [stockSymbol, setStockSymbol] = useState<string | null>(null);
  const [cryptoSymbol, setCryptoSymbol] = useState<string | null>(null);
  const [stockResult, setStockResult] = useState<StockResearchResult | null>(null);
  const [cryptoResult, setCryptoResult] = useState<CryptoResearchResult | null>(null);
  const [status, setStatus] = useState<RunStatus>({});
  const [liveFindings, setLiveFindings] = useState<AgentFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshingSymbol, setRefreshingSymbol] = useState<string | null>(null);

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
          void recordVerdict(symbol, mode, res.verdict);
        } else {
          const portfolio = await loadPortfolio();
          const holding = portfolio.find(
            (h) => h.ticker === symbol.toUpperCase()
          );
          const res = await runStockResearch(symbol, {
            force: opts.force,
            onProgress,
            holding,
          });
          setStockResult(res);
          void recordVerdict(symbol, mode, res.verdict);
        }
        pushRecent(symbol, mode);
        window.dispatchEvent(new Event("watchlist:change"));
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

  // One-time migrator: on first sign-in, ship any pre-Phase-B localStorage
  // data up to the per-user DB and clear it locally.
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(MIGRATED_FLAG) === "1") return;

    const watchlistRaw = window.localStorage.getItem("watchlist:v1");
    const portfolioRaw = window.localStorage.getItem("portfolio:v1");
    if (!watchlistRaw && !portfolioRaw) {
      window.localStorage.setItem(MIGRATED_FLAG, "1");
      return;
    }

    const watchlist = safeJsonArray(watchlistRaw);
    const portfolio = safeJsonArray(portfolioRaw);

    void fetch("/api/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlist, portfolio }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        window.localStorage.removeItem("watchlist:v1");
        window.localStorage.removeItem("portfolio:v1");
        window.localStorage.setItem(MIGRATED_FLAG, "1");
        window.dispatchEvent(new Event("watchlist:change"));
        window.dispatchEvent(new Event("portfolio:change"));
      })
      .catch(() => {
        // Don't set the flag — retry on next mount.
      });
  }, [sessionStatus]);

  // Background watchlist poller — coarse 5-min tick, only re-runs items whose
  // last check is older than the orchestrator cache TTL (4h). Skips when the
  // tab isn't visible. Sequential with a small delay so we don't fan out
  // parallel Claude calls.
  const pollingRef = useRef(false);
  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled || pollingRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      const watchlist = await loadWatchlist();
      const stale = watchlist.filter(
        (item) =>
          !item.lastChecked || Date.now() - item.lastChecked > cacheTtlMs
      );
      if (stale.length === 0) return;

      // Cache the portfolio once per poll so each stock re-run gets the
      // position-aware verdict path when held.
      const portfolio = await loadPortfolio();
      const holdingFor = (ticker: string): PortfolioHolding | undefined =>
        portfolio.find((h) => h.ticker === ticker.toUpperCase());

      pollingRef.current = true;
      try {
        for (const item of stale) {
          if (cancelled) break;
          setRefreshingSymbol(item.symbol);
          try {
            const result =
              item.mode === "crypto"
                ? await runCryptoResearch(item.symbol)
                : await runStockResearch(item.symbol, {
                    holding: holdingFor(item.symbol),
                  });
            await recordVerdict(item.symbol, item.mode, result.verdict);
            window.dispatchEvent(new Event("watchlist:change"));
          } catch (e) {
            console.error("[watchlist poller]", item.symbol, e);
          }
          await new Promise((r) => setTimeout(r, BACKGROUND_DELAY_MS));
        }
      } finally {
        setRefreshingSymbol(null);
        pollingRef.current = false;
      }
    }

    // Run once on mount, then on a coarse interval.
    void tick();
    const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg-page">
      <nav className="flex items-center gap-2 px-6 py-3 border-b border-border bg-bg-panel">
        <div className="text-[13px] font-mono font-bold tracking-wide text-text-primary mr-6">
          ⌁ Research Engine
        </div>
        {(["markets", "stocks", "crypto", "portfolio", "agents"] as Tab[]).map((t) => (
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

      {tab === "markets" ? (
        <MarketOverview
          onOpenTicker={(t) => {
            setTab("stocks");
            handleSearch(t);
          }}
        />
      ) : tab === "agents" ? (
        <AgentsGrid />
      ) : tab === "portfolio" ? (
        <PortfolioView
          onOpenTicker={(t) => {
            setTab("stocks");
            handleSearch(t);
          }}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <SearchSidebar
            mode={mode}
            status={status}
            current={currentSymbol}
            refreshingSymbol={refreshingSymbol}
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

function safeJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
