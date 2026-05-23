import type { AssetMode, Verdict, WatchlistItem } from "./types";

const KEY = "watchlist:v1";

export function loadWatchlist(): WatchlistItem[] {
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

export function saveWatchlist(items: WatchlistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage full — fail silently
  }
}

function find(
  items: WatchlistItem[],
  symbol: string,
  mode: AssetMode
): { idx: number; item?: WatchlistItem } {
  const idx = items.findIndex(
    (i) => i.symbol === symbol && i.mode === mode
  );
  return { idx, item: idx >= 0 ? items[idx] : undefined };
}

export function isWatched(symbol: string, mode: AssetMode): boolean {
  return find(loadWatchlist(), symbol, mode).idx >= 0;
}

/** Add or remove the item; returns the new watched state (true = now watched). */
export function toggleWatch(symbol: string, mode: AssetMode): boolean {
  const items = loadWatchlist();
  const { idx } = find(items, symbol, mode);
  if (idx >= 0) {
    items.splice(idx, 1);
    saveWatchlist(items);
    return false;
  }
  items.unshift({ symbol, mode, addedAt: Date.now() });
  saveWatchlist(items);
  return true;
}

/**
 * Update lastVerdict + lastChecked for an item. If the item isn't on the
 * watchlist this is a no-op (we don't auto-add tickers the user only browsed).
 *
 * Preserves `lastSeenRating` — so if the rating changed since the user last
 * viewed the row, the delta badge will show up the next time they look.
 */
export function recordVerdict(
  symbol: string,
  mode: AssetMode,
  verdict: Verdict
): void {
  const items = loadWatchlist();
  const { idx, item } = find(items, symbol, mode);
  if (idx < 0 || !item) return;
  items[idx] = {
    ...item,
    lastVerdict: verdict,
    lastChecked: Date.now(),
    // Seed lastSeenRating the first time we record a verdict so it doesn't
    // appear as a phantom change on first add.
    lastSeenRating: item.lastSeenRating ?? verdict.rating,
  };
  saveWatchlist(items);
}

/** Mark the row as viewed — clears the delta badge. */
export function markSeen(symbol: string, mode: AssetMode): void {
  const items = loadWatchlist();
  const { idx, item } = find(items, symbol, mode);
  if (idx < 0 || !item?.lastVerdict) return;
  items[idx] = { ...item, lastSeenRating: item.lastVerdict.rating };
  saveWatchlist(items);
}

export function hasChange(item: WatchlistItem): boolean {
  return Boolean(
    item.lastVerdict &&
      item.lastSeenRating &&
      item.lastVerdict.rating !== item.lastSeenRating
  );
}
