"use client";

import { fmt, fmtPrice } from "@/lib/format";
import type {
  AssetMode,
  CryptoMetrics,
  ValuationMetrics,
} from "@/lib/types";
import MetricTooltip from "./MetricTooltip";

const GREEN = "#4ade80";
const AMBER = "#fbbf24";
const RED = "#f87171";
const DIM = "#8b9ab8";

/** Heuristic color for a metric, vs reasonable long-term-investor benchmarks. */
type Bands = { good: number; warn: number; reverse?: boolean };
function bandColor(value: number, b: Bands): string {
  if (b.reverse) {
    // Higher is worse: e.g. P/E, EV/EBITDA, P/S, D/E, FDV/MC
    if (value <= b.good) return GREEN;
    if (value <= b.warn) return AMBER;
    return RED;
  }
  // Higher is better: e.g. ROE, FCF margin, Vol/MC
  if (value >= b.good) return GREEN;
  if (value >= b.warn) return AMBER;
  return RED;
}

type Tile = {
  label: string;
  value: string;
  color?: string;
  /** Key into METRIC_GLOSSARY; renders a `?` tooltip when present. */
  metricKey?: string;
};

function stockTiles(m: ValuationMetrics): Tile[] {
  const tiles: Tile[] = [];
  if (m.peTTM != null) {
    tiles.push({
      label: "P/E TTM",
      metricKey: "peTTM",
      value: m.peTTM.toFixed(1),
      color: bandColor(m.peTTM, { good: 18, warn: 30, reverse: true }),
    });
  }
  if (m.evEbitdaTTM != null) {
    tiles.push({
      label: "EV/EBITDA",
      metricKey: "evEbitdaTTM",
      value: m.evEbitdaTTM.toFixed(1),
      color: bandColor(m.evEbitdaTTM, { good: 12, warn: 20, reverse: true }),
    });
  }
  if (m.psTTM != null) {
    tiles.push({
      label: "P/S TTM",
      metricKey: "psTTM",
      value: m.psTTM.toFixed(1),
      color: bandColor(m.psTTM, { good: 3, warn: 8, reverse: true }),
    });
  }
  if (m.fcfMarginTTM != null) {
    tiles.push({
      label: "FCF Margin",
      metricKey: "fcfMarginTTM",
      value: `${m.fcfMarginTTM.toFixed(1)}%`,
      color: bandColor(m.fcfMarginTTM, { good: 15, warn: 5 }),
    });
  }
  if (m.roeTTM != null) {
    tiles.push({
      label: "ROE TTM",
      metricKey: "roeTTM",
      value: `${m.roeTTM.toFixed(1)}%`,
      color: bandColor(m.roeTTM, { good: 15, warn: 5 }),
    });
  }
  if (m.debtEquityAnnual != null) {
    tiles.push({
      label: "Debt / Equity",
      metricKey: "debtEquityAnnual",
      value: m.debtEquityAnnual.toFixed(2),
      color: bandColor(m.debtEquityAnnual, { good: 0.5, warn: 1.5, reverse: true }),
    });
  }
  if (m.dividendYieldTTM != null) {
    tiles.push({
      label: "Dividend Yield",
      metricKey: "dividendYieldTTM",
      value: `${m.dividendYieldTTM.toFixed(2)}%`,
      color: DIM,
    });
  }
  if (m.week52High != null && m.week52Low != null) {
    tiles.push({
      label: "52W Range",
      metricKey: "week52Range",
      value: `${fmtPrice(m.week52Low)} – ${fmtPrice(m.week52High)}`,
      color: DIM,
    });
  }
  return tiles;
}

function cryptoTiles(m: CryptoMetrics): Tile[] {
  const tiles: Tile[] = [];
  if (m.marketCap != null) {
    tiles.push({
      label: "Market Cap",
      metricKey: "marketCap",
      value: fmt(m.marketCap),
      color: DIM,
    });
  }
  if (m.fullyDilutedValuation != null) {
    tiles.push({
      label: "FDV",
      metricKey: "fullyDilutedValuation",
      value: fmt(m.fullyDilutedValuation),
      color: DIM,
    });
  }
  if (m.fdvOverMc != null) {
    tiles.push({
      label: "FDV / MC",
      metricKey: "fdvOverMc",
      value: `${m.fdvOverMc.toFixed(2)}×`,
      color: bandColor(m.fdvOverMc, { good: 1.2, warn: 2, reverse: true }),
    });
  }
  if (m.totalVolume24h != null) {
    tiles.push({
      label: "24h Volume",
      value: fmt(m.totalVolume24h),
      color: DIM,
    });
  }
  if (m.volumeOverMc != null) {
    tiles.push({
      label: "Vol / MC",
      metricKey: "volumeOverMc",
      value: `${(m.volumeOverMc * 100).toFixed(1)}%`,
      color: bandColor(m.volumeOverMc, { good: 0.1, warn: 0.03 }),
    });
  }
  return tiles;
}

export default function ValuationPanel({
  mode,
  metrics,
}: {
  mode: AssetMode;
  metrics: ValuationMetrics | CryptoMetrics | undefined;
}) {
  if (!metrics) return null;
  const tiles =
    mode === "crypto"
      ? cryptoTiles(metrics as CryptoMetrics)
      : stockTiles(metrics as ValuationMetrics);
  if (tiles.length === 0) return null;

  return (
    <section>
      <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-3">
        {mode === "crypto" ? "Market metrics" : "Valuation metrics"}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="bg-bg-card border border-border rounded-lg px-3 py-2.5"
          >
            <div className="text-text-dim text-[9px] font-mono uppercase tracking-[0.1em]">
              {t.metricKey ? (
                <MetricTooltip metricKey={t.metricKey} label={t.label} />
              ) : (
                t.label
              )}
            </div>
            <div
              className="text-[15px] font-mono font-semibold mt-1"
              style={{ color: t.color ?? "#f0f2f8" }}
            >
              {t.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
