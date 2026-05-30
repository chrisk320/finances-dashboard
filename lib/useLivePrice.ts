"use client";

import { useEffect, useRef, useState } from "react";
import type { AssetMode } from "./types";

type LivePrice = { price: number; changePct: number; asOf: number };

// Polls /api/market/price on an interval while the tab is visible. Seeded from
// the research snapshot so the first paint matches today's value (no flash).
// Pauses when the tab is hidden and refetches immediately on return.
export function useLivePrice({
  symbol,
  mode,
  seedPrice,
  seedChangePct,
}: {
  symbol: string;
  mode: AssetMode;
  seedPrice: number;
  seedChangePct: number;
}): LivePrice {
  const [live, setLive] = useState<LivePrice>({
    price: seedPrice,
    changePct: seedChangePct,
    asOf: Date.now(),
  });

  // Re-seed when the symbol changes so a new asset doesn't show the old price.
  useEffect(() => {
    setLive({ price: seedPrice, changePct: seedChangePct, asOf: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, mode]);

  const inFlight = useRef(false);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    const apiMode = mode === "crypto" ? "crypto" : "stock";
    const intervalMs = mode === "crypto" ? 20000 : 10000;

    async function fetchOnce() {
      if (cancelled || inFlight.current) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      inFlight.current = true;
      try {
        const res = await fetch(
          `/api/market/price?symbol=${encodeURIComponent(symbol)}&mode=${apiMode}`,
        );
        if (!res.ok) return;
        const d = (await res.json()) as LivePrice;
        // Keep the last good value if the upstream returned nothing.
        if (cancelled || !d || d.price <= 0) return;
        setLive({ price: d.price, changePct: d.changePct, asOf: d.asOf });
      } catch {
        // transient — next tick retries
      } finally {
        inFlight.current = false;
      }
    }

    void fetchOnce();
    const interval = setInterval(() => void fetchOnce(), intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchOnce();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, mode]);

  return live;
}
