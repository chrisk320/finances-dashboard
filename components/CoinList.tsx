"use client";

import { fmt, fmtPrice, pct, pctColor } from "@/lib/format";

export type CoinRow = {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
  marketCap: number;
};

export default function CoinList({
  rows,
  onOpenCoin,
}: {
  rows: CoinRow[];
  onOpenCoin: (symbol: string) => void;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      {rows.map((c, i) => (
        <button
          key={c.ticker}
          onClick={() => onOpenCoin(c.ticker)}
          className={`w-full grid grid-cols-[20px_1fr_auto_auto] gap-3 items-center px-4 py-2.5 text-[12px] font-mono text-left hover:bg-[#15182a] transition-colors ${
            i < rows.length - 1 ? "border-b border-[#0d0f1a]" : ""
          }`}
        >
          <span className="text-text-dim text-[10px]">{i + 1}</span>
          <span className="min-w-0">
            <span className="text-text-primary font-semibold">{c.ticker}</span>
            <span className="block text-text-muted text-[10px] truncate">
              {c.name}
            </span>
          </span>
          <span className="text-right">
            <span className="block text-text-secondary">{fmtPrice(c.price)}</span>
            <span
              className="block text-[10px]"
              style={{ color: pctColor(c.changePct) }}
            >
              {pct(c.changePct)}
            </span>
          </span>
          <span className="text-text-dim text-right text-[11px] w-[64px]">
            {c.marketCap > 0 ? fmt(c.marketCap) : "—"}
          </span>
        </button>
      ))}
    </div>
  );
}
