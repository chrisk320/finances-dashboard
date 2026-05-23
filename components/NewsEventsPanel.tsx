"use client";

import { timeAgo } from "@/lib/format";
import type { NewsEvent, NewsImpact } from "@/lib/types";

const IMPACT_STYLE: Record<NewsImpact, { bg: string; fg: string; label: string }> = {
  positive: { bg: "#0e2b1a", fg: "#4ade80", label: "Helps" },
  neutral: { bg: "#221a05", fg: "#fbbf24", label: "Mixed" },
  negative: { bg: "#2a0d0d", fg: "#f87171", label: "Hurts" },
};

function hostname(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default function NewsEventsPanel({
  events,
  sectorEtf,
}: {
  events: NewsEvent[] | undefined;
  sectorEtf?: string | null;
}) {
  if (!events || events.length === 0) return null;

  const company = events.filter((e) => e.scope === "company");
  const sector = events.filter((e) => e.scope === "sector");

  return (
    <section>
      <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-3">
        Key events
      </h2>
      <div className="flex flex-col gap-4">
        {company.length > 0 && (
          <Group label="Company" events={company} />
        )}
        {sector.length > 0 && (
          <Group
            label={`Sector${sectorEtf ? ` · ${sectorEtf}` : ""}`}
            events={sector}
          />
        )}
      </div>
    </section>
  );
}

function Group({ label, events }: { label: string; events: NewsEvent[] }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted font-mono mb-2">
        {label}
      </div>
      <div className="flex flex-col gap-2">
        {events.map((e, i) => (
          <EventRow key={`${e.title}-${i}`} event={e} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: NewsEvent }) {
  const style = IMPACT_STYLE[event.impact];
  const host = hostname(event.url);
  const ageMs = event.publishedAt ? event.publishedAt * 1000 : null;

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
        {event.url ? (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-primary text-[13px] font-semibold leading-snug hover:text-[#9EC87E] transition-colors"
          >
            {event.title}
          </a>
        ) : (
          <div className="text-text-primary text-[13px] font-semibold leading-snug">
            {event.title}
          </div>
        )}
        {event.rationale && (
          <div className="text-text-secondary text-[12px] mt-1 leading-relaxed">
            {event.rationale}
          </div>
        )}
        <div className="flex gap-2 mt-1.5 text-[10px] font-mono text-text-dim">
          {host && <span>{host}</span>}
          {!host && event.source && <span>{event.source}</span>}
          {ageMs && (
            <>
              <span>·</span>
              <span>{timeAgo(ageMs)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
