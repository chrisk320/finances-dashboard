"use client";

import { fmt, pct, pctColor } from "@/lib/format";
import type { GlobalMarket } from "@/lib/cryptoData";

export default function CryptoStats({ global }: { global: GlobalMarket }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Tile label="Total market cap">
        <span className="text-text-primary">{fmt(global.total_market_cap_usd)}</span>
        <span
          className="text-[11px] ml-2"
          style={{ color: pctColor(global.market_cap_change_24h) }}
        >
          {pct(global.market_cap_change_24h)}
        </span>
      </Tile>
      <Tile label="24h volume">
        <span className="text-text-primary">{fmt(global.volume_24h_usd)}</span>
      </Tile>
      <Tile label="BTC dominance">
        <span className="text-text-primary">
          {global.btc_dominance.toFixed(1)}%
        </span>
      </Tile>
      <Tile label="ETH dominance">
        <span className="text-text-primary">
          {global.eth_dominance.toFixed(1)}%
        </span>
      </Tile>
    </div>
  );
}

function Tile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl px-4 py-3">
      <div className="text-[9px] uppercase tracking-[0.12em] text-text-dim font-mono mb-1.5">
        {label}
      </div>
      <div className="text-[15px] font-mono font-semibold">{children}</div>
    </div>
  );
}
