import type { PortfolioHolding } from "./types";
import { isWatched, toggleWatch } from "./watchlist";

export async function loadPortfolio(): Promise<PortfolioHolding[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/portfolio", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getHolding(
  ticker: string,
): Promise<PortfolioHolding | undefined> {
  const t = ticker.toUpperCase();
  return (await loadPortfolio()).find((h) => h.ticker === t);
}

export async function isHeld(ticker: string): Promise<boolean> {
  return Boolean(await getHolding(ticker));
}

/**
 * Add (or overwrite) a holding. Also auto-stars the ticker on the watchlist
 * so the background poller refreshes its verdict.
 */
export async function addHolding(input: {
  ticker: string;
  shares: number;
  costBasis: number;
  notes?: string;
}): Promise<void> {
  const ticker = input.ticker.toUpperCase().trim();
  if (!ticker || !Number.isFinite(input.shares) || input.shares <= 0) return;
  if (!Number.isFinite(input.costBasis) || input.costBasis <= 0) return;

  try {
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker,
        shares: input.shares,
        costBasis: input.costBasis,
        notes: input.notes,
      }),
    });
    if (!(await isWatched(ticker, "stocks"))) {
      await toggleWatch(ticker, "stocks");
    }
  } catch {
    // No-op.
  }
}

export async function updateHolding(
  ticker: string,
  patch: Partial<Pick<PortfolioHolding, "shares" | "costBasis" | "notes">>,
): Promise<void> {
  try {
    await fetch("/api/portfolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: ticker.toUpperCase(), ...patch }),
    });
  } catch {
    // No-op.
  }
}

export async function removeHolding(ticker: string): Promise<void> {
  try {
    await fetch("/api/portfolio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: ticker.toUpperCase() }),
    });
  } catch {
    // No-op.
  }
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
