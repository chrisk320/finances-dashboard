"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fmtPrice, pct, pctColor } from "@/lib/format";
import { getCached } from "@/lib/orchestrator";
import {
  addHolding,
  loadPortfolio,
  parseHoldingsCsv,
  removeHolding,
} from "@/lib/portfolio";
import { RATING_STYLE } from "@/lib/verdictStyle";
import { loadWatchlist } from "@/lib/watchlist";
import type {
  PortfolioHolding,
  StockResearchResult,
  Verdict,
} from "@/lib/types";

type Quotes = Record<string, number | null>;

async function fetchQuote(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `/api/finnhub?path=${encodeURIComponent(`/quote?symbol=${ticker}`)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { c?: number };
    return typeof data.c === "number" && data.c > 0 ? data.c : null;
  } catch {
    return null;
  }
}

function findVerdict(ticker: string): Verdict | undefined {
  const watched = loadWatchlist().find(
    (w) => w.symbol === ticker && w.mode === "stocks"
  );
  if (watched?.lastVerdict) return watched.lastVerdict;
  const cached = getCached<StockResearchResult>(ticker);
  return cached?.verdict;
}

export default function PortfolioView({
  onOpenTicker,
}: {
  onOpenTicker: (ticker: string) => void;
}) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [quotes, setQuotes] = useState<Quotes>({});
  const [refreshing, setRefreshing] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");

  // Form state
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const refreshQuotes = useCallback(async (items: PortfolioHolding[]) => {
    if (items.length === 0) {
      setQuotes({});
      return;
    }
    setRefreshing(true);
    const results = await Promise.all(
      items.map(async (h) => [h.ticker, await fetchQuote(h.ticker)] as const)
    );
    setQuotes(Object.fromEntries(results));
    setRefreshing(false);
  }, []);

  // Load + sync portfolio
  useEffect(() => {
    const items = loadPortfolio();
    setHoldings(items);
    void refreshQuotes(items);
    const sync = () => {
      const next = loadPortfolio();
      setHoldings(next);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("portfolio:change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("portfolio:change", sync);
    };
  }, [refreshQuotes]);

  const totals = useMemo(() => {
    let cost = 0;
    let value = 0;
    let valued = 0; // holdings with a live quote
    for (const h of holdings) {
      cost += h.shares * h.costBasis;
      const q = quotes[h.ticker];
      if (q != null) {
        value += h.shares * q;
        valued += 1;
      }
    }
    const pnl = value - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    return { cost, value, pnl, pnlPct, valued, total: holdings.length };
  }, [holdings, quotes]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const t = ticker.trim().toUpperCase();
    const sh = Number(shares);
    const cb = Number(costBasis.replace(/^\$/, ""));
    if (!t) return setFormError("Ticker required.");
    if (!Number.isFinite(sh) || sh <= 0)
      return setFormError("Shares must be a positive number.");
    if (!Number.isFinite(cb) || cb <= 0)
      return setFormError("Cost basis must be a positive number.");
    addHolding({ ticker: t, shares: sh, costBasis: cb });
    window.dispatchEvent(new Event("portfolio:change"));
    window.dispatchEvent(new Event("watchlist:change"));
    setTicker("");
    setShares("");
    setCostBasis("");
    const next = loadPortfolio();
    setHoldings(next);
    void refreshQuotes(next);
  }

  function handleRemove(t: string) {
    removeHolding(t);
    window.dispatchEvent(new Event("portfolio:change"));
    const next = loadPortfolio();
    setHoldings(next);
    setQuotes((q) => {
      const { [t]: _, ...rest } = q;
      return rest;
    });
  }

  function handleCsvImport() {
    const parsed = parseHoldingsCsv(csvText);
    if (parsed.length === 0) {
      setFormError("Couldn't parse any rows. Format: TICKER, SHARES, COST_BASIS");
      return;
    }
    for (const row of parsed) {
      addHolding(row);
    }
    window.dispatchEvent(new Event("portfolio:change"));
    window.dispatchEvent(new Event("watchlist:change"));
    setCsvText("");
    setCsvOpen(false);
    const next = loadPortfolio();
    setHoldings(next);
    void refreshQuotes(next);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-1">
            Portfolio
          </div>
          <h1 className="text-[24px] font-mono font-bold tracking-wide text-text-primary">
            {holdings.length === 0
              ? "No holdings yet"
              : `${holdings.length} ${holdings.length === 1 ? "holding" : "holdings"}`}
          </h1>
        </div>
        <button
          onClick={() => void refreshQuotes(holdings)}
          disabled={refreshing || holdings.length === 0}
          className="text-[11px] font-mono border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-card rounded-md px-3 py-1.5 disabled:opacity-50 transition-colors"
        >
          {refreshing ? "Refreshing…" : "↺ Refresh prices"}
        </button>
      </header>

      {holdings.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryTile label="Total Cost" value={fmtPrice(totals.cost)} />
          <SummaryTile
            label="Market Value"
            value={totals.valued > 0 ? fmtPrice(totals.value) : "—"}
            sub={
              totals.valued < totals.total
                ? `${totals.valued}/${totals.total} priced`
                : undefined
            }
          />
          <SummaryTile
            label="Total P/L"
            value={
              totals.valued > 0
                ? `${totals.pnl >= 0 ? "+" : "-"}${fmtPrice(Math.abs(totals.pnl))}`
                : "—"
            }
            valueColor={totals.valued > 0 ? pctColor(totals.pnl) : undefined}
            sub={totals.valued > 0 ? pct(totals.pnlPct) : undefined}
            subColor={totals.valued > 0 ? pctColor(totals.pnl) : undefined}
          />
        </section>
      )}

      <section className="bg-bg-card border border-border rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-3">
          Add holding
        </div>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
          <Input
            label="Ticker"
            value={ticker}
            onChange={setTicker}
            placeholder="NVDA"
            width="w-[110px]"
            mono
          />
          <Input
            label="Shares"
            value={shares}
            onChange={setShares}
            placeholder="100"
            width="w-[110px]"
            inputType="number"
          />
          <Input
            label="Cost basis $/share"
            value={costBasis}
            onChange={setCostBasis}
            placeholder="425.50"
            width="w-[150px]"
            inputType="number"
          />
          <button
            type="submit"
            className="text-[11px] uppercase tracking-[0.12em] font-mono text-text-primary bg-border-subtle border border-border-subtle hover:bg-[#34384e] transition-colors rounded-md px-4 py-2"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setCsvOpen((v) => !v)}
            className="text-[11px] font-mono text-text-secondary hover:text-text-primary ml-auto"
          >
            {csvOpen ? "Hide CSV import" : "Import CSV"}
          </button>
        </form>
        {formError && (
          <div className="mt-2 text-[11px] font-mono text-[#fca5a5]">
            {formError}
          </div>
        )}

        {csvOpen && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-text-dim font-mono">
              CSV import · one row per line · TICKER, SHARES, COST_BASIS
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"NVDA, 100, 425.50\nMSFT, 50, 380\nAAPL, 30, 175"}
              className="bg-bg-panel border border-border rounded-md px-3 py-2 text-[12px] font-mono text-text-primary outline-none focus:border-text-muted min-h-[100px]"
            />
            <button
              type="button"
              onClick={handleCsvImport}
              className="self-start text-[11px] uppercase tracking-[0.12em] font-mono text-text-primary bg-border-subtle border border-border-subtle hover:bg-[#34384e] rounded-md px-3 py-1.5"
            >
              Add all
            </button>
          </div>
        )}
      </section>

      {holdings.length === 0 ? (
        <div className="text-text-muted text-[12px] font-mono">
          Add your first holding above. It will be auto-added to the watchlist so
          the background poller refreshes its verdict every few hours.
        </div>
      ) : (
        <section className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_70px_90px_90px_100px_120px_100px_60px] gap-3 px-4 py-2.5 border-b border-border text-[9px] font-mono uppercase tracking-[0.1em] text-text-dim">
            <div>Ticker</div>
            <div className="text-right">Shares</div>
            <div className="text-right">Avg Cost</div>
            <div className="text-right">Current</div>
            <div className="text-right">Mkt Value</div>
            <div className="text-right">P / L</div>
            <div className="text-center">Verdict</div>
            <div className="text-right">·</div>
          </div>
          {holdings.map((h, i) => {
            const q = quotes[h.ticker];
            const cost = h.shares * h.costBasis;
            const value = q != null ? h.shares * q : null;
            const pnl = value != null ? value - cost : null;
            const pnlPct = pnl != null && cost > 0 ? (pnl / cost) * 100 : null;
            const verdict = findVerdict(h.ticker);
            const style = verdict ? RATING_STYLE[verdict.rating] : null;
            return (
              <div
                key={h.ticker}
                className={`grid grid-cols-[1fr_70px_90px_90px_100px_120px_100px_60px] gap-3 px-4 py-2.5 items-center text-[12px] font-mono ${
                  i < holdings.length - 1 ? "border-b border-[#0d0f1a]" : ""
                }`}
              >
                <button
                  onClick={() => onOpenTicker(h.ticker)}
                  className="text-left text-text-primary font-semibold hover:text-[#9EC87E] transition-colors"
                  title="Open in Stocks"
                >
                  {h.ticker}
                </button>
                <div className="text-right text-text-secondary">{h.shares}</div>
                <div className="text-right text-text-secondary">
                  {fmtPrice(h.costBasis)}
                </div>
                <div className="text-right text-text-secondary">
                  {q != null ? fmtPrice(q) : "—"}
                </div>
                <div className="text-right text-text-secondary">
                  {value != null ? fmtPrice(value) : "—"}
                </div>
                <div
                  className="text-right"
                  style={{ color: pnl != null ? pctColor(pnl) : "#4a5170" }}
                >
                  {pnl != null && pnlPct != null
                    ? `${pnl >= 0 ? "+" : "-"}${fmtPrice(
                        Math.abs(pnl)
                      )} (${pct(pnlPct)})`
                    : "—"}
                </div>
                <div className="text-center">
                  {verdict && style ? (
                    <span
                      className="text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full"
                      style={{
                        background: `${style.border}1a`,
                        color: style.text,
                        border: `1px solid ${style.border}55`,
                      }}
                    >
                      {verdict.rating}
                    </span>
                  ) : (
                    <span className="text-text-dim text-[10px]">—</span>
                  )}
                </div>
                <div className="text-right flex justify-end gap-1.5">
                  <button
                    onClick={() => onOpenTicker(h.ticker)}
                    title="Open"
                    className="text-text-secondary hover:text-text-primary"
                  >
                    ↗
                  </button>
                  <button
                    onClick={() => handleRemove(h.ticker)}
                    title="Remove"
                    className="text-text-muted hover:text-[#f87171]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub,
  valueColor,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  subColor?: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-[9px] uppercase tracking-[0.12em] font-mono text-text-dim">
        {label}
      </div>
      <div
        className="text-[20px] font-mono font-semibold mt-1"
        style={{ color: valueColor ?? "#f0f2f8" }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[10px] font-mono mt-0.5"
          style={{ color: subColor ?? "#4a5170" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  width,
  mono = false,
  inputType = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width: string;
  mono?: boolean;
  inputType?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-[0.12em] text-text-dim font-mono">
        {label}
      </span>
      <input
        type={inputType}
        inputMode={inputType === "number" ? "decimal" : undefined}
        step="any"
        value={value}
        onChange={(e) => onChange(mono ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={placeholder}
        className={`${width} bg-bg-panel border border-border rounded-md px-3 py-2 text-[12.5px] text-text-primary font-mono focus:outline-none focus:border-text-muted`}
      />
    </label>
  );
}
