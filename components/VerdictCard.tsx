"use client";

import type { Verdict } from "@/lib/types";
import { CONFIDENCE_COLOR, RATING_STYLE } from "@/lib/verdictStyle";

export default function VerdictCard({ verdict }: { verdict: Verdict }) {
  const style = RATING_STYLE[verdict.rating];
  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.border}55`,
        borderRadius: 14,
      }}
      className="px-5 py-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <span
          style={{ background: `${style.border}22`, color: style.text }}
          className="text-[10px] uppercase tracking-[0.14em] font-mono font-bold px-2.5 py-1 rounded-md border"
        >
          Intelligence Hub
        </span>
        <span
          style={{ color: style.text }}
          className="text-[18px] font-mono font-bold tracking-wide"
        >
          {verdict.rating}
        </span>
        <span
          style={{ color: CONFIDENCE_COLOR[verdict.confidence] }}
          className="text-[10px] uppercase tracking-[0.12em] font-mono ml-auto"
        >
          {verdict.confidence} confidence
        </span>
      </div>
      <p className="text-text-primary text-[13px] leading-relaxed">
        {verdict.summary}
      </p>
    </div>
  );
}
