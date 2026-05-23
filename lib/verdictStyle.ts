import type { Verdict } from "./types";

export const RATING_STYLE: Record<
  Verdict["rating"],
  { bg: string; border: string; text: string }
> = {
  "STRONG BUY": { bg: "#0e2b1a", border: "#4ade80", text: "#4ade80" },
  BUY: { bg: "#0e2b1a", border: "#34d399", text: "#34d399" },
  HOLD: { bg: "#221a05", border: "#fbbf24", text: "#fbbf24" },
  AVOID: { bg: "#2a0d0d", border: "#f87171", text: "#f87171" },
};

export const CONFIDENCE_COLOR: Record<Verdict["confidence"], string> = {
  HIGH: "#4ade80",
  MEDIUM: "#fbbf24",
  LOW: "#f87171",
};

/**
 * Direction of change between two ratings — used for the watchlist delta badge.
 * Order: AVOID < HOLD < BUY < STRONG BUY.
 */
export function ratingDirection(
  prev: Verdict["rating"],
  next: Verdict["rating"]
): "up" | "down" | "same" {
  const order: Verdict["rating"][] = ["AVOID", "HOLD", "BUY", "STRONG BUY"];
  const a = order.indexOf(prev);
  const b = order.indexOf(next);
  if (a < 0 || b < 0 || a === b) return "same";
  return b > a ? "up" : "down";
}
