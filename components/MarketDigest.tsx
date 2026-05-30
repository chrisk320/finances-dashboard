"use client";

import { timeAgo } from "@/lib/format";
import type { MarketDigestItem, NewsImpact } from "@/lib/types";

const IMPACT_STYLE: Record<NewsImpact, { bg: string; fg: string; label: string }> = {
  positive: { bg: "#0e2b1a", fg: "#4ade80", label: "Positive" },
  neutral: { bg: "#221a05", fg: "#fbbf24", label: "Neutral" },
  negative: { bg: "#2a0d0d", fg: "#f87171", label: "Negative" },
};

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default function MarketDigest({
  items,
  onOpenTicker,
}: {
  items: MarketDigestItem[];
  onOpenTicker: (ticker: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <DigestRow key={`${item.url}-${i}`} item={item} onOpenTicker={onOpenTicker} />
      ))}
    </div>
  );
}

function DigestRow({
  item,
  onOpenTicker,
}: {
  item: MarketDigestItem;
  onOpenTicker: (ticker: string) => void;
}) {
  const style = IMPACT_STYLE[item.impact];
  const host = hostname(item.url);
  const hasTicker = item.related && /^[A-Z.]{1,6}$/.test(item.related);

  return (
    <div className="bg-bg-card border border-border rounded-xl px-4 py-3 flex gap-3">
      <span
        className="text-[9px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded-full self-start shrink-0"
        style={{
          background: style.bg,
          color: style.fg,
          border: `1px solid ${style.fg}55`,
        }}
      >
        {style.label}
      </span>
      <div className="flex-1 min-w-0">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-primary text-[13px] font-semibold leading-snug hover:text-[#9EC87E] transition-colors"
        >
          {item.headline}
        </a>
        <div className="text-text-secondary text-[12px] mt-1 leading-relaxed">
          {item.whyItMatters}
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-text-dim">
          {host && <span>{host}</span>}
          {!host && item.source && <span>{item.source}</span>}
          {item.datetime > 0 && (
            <>
              <span>·</span>
              <span>{timeAgo(item.datetime * 1000)}</span>
            </>
          )}
          {hasTicker && (
            <>
              <span>·</span>
              <button
                onClick={() => onOpenTicker(item.related)}
                className="text-[#9EC87E] hover:text-text-primary transition-colors"
                title={`Research ${item.related}`}
              >
                {item.related} →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
