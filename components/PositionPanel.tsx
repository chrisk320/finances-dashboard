"use client";

import { useEffect, useState } from "react";
import { fmtPrice, pct, pctColor } from "@/lib/format";
import { getHolding } from "@/lib/portfolio";
import type { PortfolioHolding } from "@/lib/types";

export default function PositionPanel({
  symbol,
  currentPrice,
}: {
  symbol: string;
  currentPrice: number;
}) {
  const [holding, setHolding] = useState<PortfolioHolding | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      void getHolding(symbol).then((h) => {
        if (!cancelled) setHolding(h);
      });
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("portfolio:change", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", sync);
      window.removeEventListener("portfolio:change", sync);
    };
  }, [symbol]);

  if (!holding) return null;

  const totalCost = holding.shares * holding.costBasis;
  const marketValue = currentPrice > 0 ? holding.shares * currentPrice : 0;
  const pnl = marketValue - totalCost;
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const hasPrice = currentPrice > 0;

  return (
    <section className="bg-bg-card border border-border rounded-xl px-5 py-3.5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono">
          Your position
        </div>
        {hasPrice && (
          <div
            className="text-[13px] font-mono font-semibold"
            style={{ color: pctColor(pnl) }}
          >
            {pnl >= 0 ? "+" : ""}
            {fmtPrice(Math.abs(pnl)).replace("$", pnl >= 0 ? "$" : "-$")}{" "}
            <span className="ml-1">({pct(pnlPct)})</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-[12px] font-mono">
        <div>
          <div className="text-text-dim text-[9px] uppercase tracking-[0.1em]">
            Shares
          </div>
          <div className="text-text-primary mt-0.5">{holding.shares}</div>
        </div>
        <div>
          <div className="text-text-dim text-[9px] uppercase tracking-[0.1em]">
            Avg Cost
          </div>
          <div className="text-text-primary mt-0.5">
            {fmtPrice(holding.costBasis)}
          </div>
        </div>
        <div>
          <div className="text-text-dim text-[9px] uppercase tracking-[0.1em]">
            Cost Basis
          </div>
          <div className="text-text-primary mt-0.5">{fmtPrice(totalCost)}</div>
        </div>
        <div>
          <div className="text-text-dim text-[9px] uppercase tracking-[0.1em]">
            Market Value
          </div>
          <div className="text-text-primary mt-0.5">
            {hasPrice ? fmtPrice(marketValue) : "—"}
          </div>
        </div>
      </div>
    </section>
  );
}
