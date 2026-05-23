import type { PortfolioHolding } from "./types";
import { isWatched, toggleWatch } from "./watchlist";

const KEY = "portfolio:v1";

export function loadPortfolio(): PortfolioHolding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePortfolio(items: PortfolioHolding[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage full — fail silently
  }
}

export function getHolding(ticker: string): PortfolioHolding | undefined {
  const t = ticker.toUpperCase();
  return loadPortfolio().find((h) => h.ticker === t);
}

export function isHeld(ticker: string): boolean {
  return Boolean(getHolding(ticker));
}

/**
 * Add (or overwrite) a holding. Also auto-stars the ticker on the watchlist
 * so the background poller refreshes its verdict.
 */
export function addHolding(input: {
  ticker: string;
  shares: number;
  costBasis: number;
  notes?: string;
}): void {
  const ticker = input.ticker.toUpperCase().trim();
  if (!ticker || !Number.isFinite(input.shares) || input.shares <= 0) return;
  if (!Number.isFinite(input.costBasis) || input.costBasis <= 0) return;

  const items = loadPortfolio();
  const idx = items.findIndex((h) => h.ticker === ticker);
  const next: PortfolioHolding = {
    ticker,
    shares: input.shares,
    costBasis: input.costBasis,
    addedAt: idx >= 0 ? items[idx].addedAt : Date.now(),
    notes: input.notes,
  };
  if (idx >= 0) items[idx] = next;
  else items.unshift(next);
  savePortfolio(items);

  // Auto-star so the watchlist poller keeps verdicts fresh.
  if (!isWatched(ticker, "stocks")) {
    toggleWatch(ticker, "stocks");
  }
}

export function updateHolding(
  ticker: string,
  patch: Partial<Pick<PortfolioHolding, "shares" | "costBasis" | "notes">>
): void {
  const t = ticker.toUpperCase();
  const items = loadPortfolio();
  const idx = items.findIndex((h) => h.ticker === t);
  if (idx < 0) return;
  items[idx] = { ...items[idx], ...patch };
  savePortfolio(items);
}

export function removeHolding(ticker: string): void {
  const t = ticker.toUpperCase();
  savePortfolio(loadPortfolio().filter((h) => h.ticker !== t));
}

/**
 * Parse a CSV/TSV blob of `TICKER, SHARES, COST_BASIS` rows.
 * Skips blank lines and any header row that doesn't have a numeric second column.
 */
export function parseHoldingsCsv(raw: string): Array<{
  ticker: string;
  shares: number;
  costBasis: number;
}> {
  const out: Array<{ ticker: string; shares: number; costBasis: number }> = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/[,\t]/).map((p) => p.trim());
    if (parts.length < 3) continue;
    const ticker = parts[0].toUpperCase();
    const shares = Number(parts[1]);
    const costBasis = Number(parts[2].replace(/^\$/, ""));
    if (!ticker || !Number.isFinite(shares) || shares <= 0) continue;
    if (!Number.isFinite(costBasis) || costBasis <= 0) continue;
    out.push({ ticker, shares, costBasis });
  }
  return out;
}
