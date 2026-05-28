"use client";

import { useEffect, useState } from "react";
import {
  hasChange,
  loadWatchlist,
  markSeen,
} from "@/lib/watchlist";
import { RATING_STYLE, ratingDirection } from "@/lib/verdictStyle";
import type { AssetMode, WatchlistItem } from "@/lib/types";

export default function WatchlistSection({
  mode,
  current,
  refreshingSymbol,
  onOpen,
}: {
  mode: AssetMode;
  current: string | null;
  /** Symbol currently being re-run in the background, if any. */
  refreshingSymbol?: string | null;
  onOpen: (symbol: string) => void;
}) {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      void loadWatchlist().then((next) => {
        if (!cancelled) setItems(next);
      });
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("watchlist:change", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", sync);
      window.removeEventListener("watchlist:change", sync);
    };
  }, []);

  const filtered = items.filter((i) => i.mode === mode);
  if (filtered.length === 0) return null;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-text-dim mb-2 font-mono">
        Watchlist
      </div>
      <div className="flex flex-col gap-1">
        {filtered.map((item) => {
          const rating = item.lastVerdict?.rating;
          const style = rating ? RATING_STYLE[rating] : null;
          const changed = hasChange(item);
          const direction =
            changed && item.lastSeenRating && rating
              ? ratingDirection(item.lastSeenRating, rating)
              : "same";
          const isOpen = current === item.symbol;
          const isRefreshing = refreshingSymbol === item.symbol;

          return (
            <button
              key={`${item.mode}:${item.symbol}`}
              onClick={() => {
                void markSeen(item.symbol, item.mode).then(() => {
                  window.dispatchEvent(new Event("watchlist:change"));
                });
                onOpen(item.symbol);
              }}
              className={`flex items-center gap-2 text-left px-2 py-1.5 text-[11px] font-mono rounded-md transition-colors ${
                isOpen
                  ? "bg-bg-card text-text-primary"
                  : "text-text-secondary hover:bg-bg-card"
              }`}
            >
              {style ? (
                <span
                  className={isRefreshing ? "pulse-dot" : ""}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: style.border,
                    display: "inline-block",
                  }}
                />
              ) : (
                <span
                  className={isRefreshing ? "pulse-dot" : ""}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: "#4a5170",
                    display: "inline-block",
                  }}
                />
              )}
              <span className="flex-1 truncate">{item.symbol}</span>
              {changed && style && rating && (
                <span
                  style={{
                    background: `${style.border}1a`,
                    color: style.text,
                    border: `1px solid ${style.border}55`,
                  }}
                  className="text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full"
                >
                  {direction === "up" ? "↑" : direction === "down" ? "↓" : "•"}{" "}
                  {rating}
                </span>
              )}
              {!changed && rating && style && (
                <span
                  style={{ color: style.text }}
                  className="text-[9px] uppercase tracking-[0.1em]"
                >
                  {rating}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
