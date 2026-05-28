import type { AssetMode, Verdict, WatchlistItem } from "./types";

export async function loadWatchlist(): Promise<WatchlistItem[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/watchlist", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function isWatched(symbol: string, mode: AssetMode): Promise<boolean> {
  const items = await loadWatchlist();
  return items.some((i) => i.symbol === symbol && i.mode === mode);
}

/** Add or remove the item; returns the new watched state (true = now watched). */
export async function toggleWatch(
  symbol: string,
  mode: AssetMode,
): Promise<boolean> {
  try {
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, mode }),
    });
    if (!res.ok) return false;
    const { watched } = await res.json();
    return Boolean(watched);
  } catch {
    return false;
  }
}

export async function recordVerdict(
  symbol: string,
  mode: AssetMode,
  verdict: Verdict,
): Promise<void> {
  try {
    await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, mode, verdict }),
    });
  } catch {
    // No-op: poller will retry on next tick.
  }
}

export async function markSeen(symbol: string, mode: AssetMode): Promise<void> {
  try {
    await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, mode, markSeen: true }),
    });
  } catch {
    // No-op.
  }
}

export function hasChange(item: WatchlistItem): boolean {
  return Boolean(
    item.lastVerdict &&
      item.lastSeenRating &&
      item.lastVerdict.rating !== item.lastSeenRating,
  );
}
