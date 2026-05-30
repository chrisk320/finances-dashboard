"use client";

import { useEffect, useState } from "react";
import LineChart from "./LineChart";
import { pct, pctColor } from "@/lib/format";
import type { AssetMode } from "@/lib/types";

const RANGE_OPTIONS = ["1M", "6M", "1Y"] as const;
type Range = (typeof RANGE_OPTIONS)[number];

type ChartData = { closes: number[]; changePct: number };

// Per-symbol/range cache so toggling ranges or revisiting a ticker is instant
// (no refetch, no shimmer) within a page session.
const cache = new Map<string, ChartData>();

export default function PriceChart({
  symbol,
  mode,
}: {
  symbol: string;
  mode: AssetMode;
}) {
  const apiMode = mode === "crypto" ? "crypto" : "stock";
  const [range, setRange] = useState<Range>("6M");
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = `${apiMode}:${symbol.toUpperCase()}:${range}`;
    const cached = cache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/market/history?symbol=${encodeURIComponent(
        symbol,
      )}&mode=${apiMode}&range=${range}`,
    )
      .then((r) => r.json())
      .then((d: { closes?: number[]; changePct?: number }) => {
        if (cancelled) return;
        const cd: ChartData = {
          closes: d.closes ?? [],
          changePct: d.changePct ?? 0,
        };
        cache.set(key, cd);
        setData(cd);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setData({ closes: [], changePct: 0 });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, apiMode, range]);

  const hasData = !!data && data.closes.length > 1;

  return (
    <section className="bg-bg-card border border-border rounded-xl px-5 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono">
          Price
          {hasData && (
            <span
              className="ml-2 normal-case tracking-normal"
              style={{ color: pctColor(data!.changePct) }}
            >
              {pct(data!.changePct)} · {range}
            </span>
          )}
        </div>
        <div className="flex gap-1 font-mono">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[10px] uppercase tracking-[0.1em] rounded px-2 py-1 transition-colors ${
                r === range
                  ? "bg-[#1a1d2e] text-text-primary"
                  : "text-text-muted hover:text-text-secondary hover:bg-[#15182a]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="h-[160px] rounded bg-[#15182a] animate-pulse" />
      ) : hasData ? (
        <LineChart
          data={data!.closes}
          color={pctColor(data!.changePct)}
          height={160}
        />
      ) : (
        <div className="h-[160px] flex items-center justify-center">
          <p className="text-text-muted text-[12px] font-mono">
            Chart unavailable right now.
          </p>
        </div>
      )}
    </section>
  );
}
