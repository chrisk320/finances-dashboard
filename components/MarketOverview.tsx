"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { fmtPrice, pct, pctColor, timeAgo } from "@/lib/format";

type Mover = {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
};
type Scope = "you" | "market" | "basket";
type MoversData = {
  scope: Scope;
  gainers: Mover[];
  losers: Mover[];
  asOf: number;
};

type Sp500Data = {
  closes: number[];
  level: number;
  changePct: number;
  asOf: number;
};

type Sector = {
  etf: string;
  label: string;
  price: number;
  changePct: number;
};
type SectorsData = { sectors: Sector[]; asOf: number };

type EarningsItem = {
  symbol: string;
  name: string;
  date: string;
  hour: string;
  epsEstimate: number | null;
};
type EarningsData = {
  scope: "you" | "market";
  items: EarningsItem[];
  asOf: number;
};

const HOUR_LABEL: Record<string, string> = {
  bmo: "Before open",
  amc: "After close",
  dmh: "During hours",
};

function fmtEarningsDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const MOVERS_HEADING: Record<Scope, string> = {
  you: "Your movers",
  market: "Market movers",
  basket: "Movers · popular names",
};

type Headline = {
  headline: string;
  source: string;
  url: string;
  datetime: number;
  related: string;
};
type NewsData = {
  general: Headline[];
  sectors: { label: string; etf: string; items: Headline[] }[];
  asOf: number;
};
type BriefingData = { briefing: string; asOf: number };

// Persists across Markets-tab remounts within a page session so switching tabs
// back to Markets reuses the briefing without a re-fetch or a shimmer flash.
let cachedBriefing: BriefingData | null = null;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function MarketOverview({
  onOpenTicker,
}: {
  onOpenTicker: (ticker: string) => void;
}) {
  const { status: sessionStatus } = useSession();
  const [movers, setMovers] = useState<MoversData | null>(null);
  const [news, setNews] = useState<NewsData | null>(null);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [sp500, setSp500] = useState<Sp500Data | null>(null);
  const [sectors, setSectors] = useState<SectorsData | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [moversLoading, setMoversLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [sp500Loading, setSp500Loading] = useState(true);
  const [sectorsLoading, setSectorsLoading] = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(true);

  // User-agnostic sections: fetch once on mount.
  useEffect(() => {
    let cancelled = false;
    void getJson<NewsData>("/api/market/news").then((d) => {
      if (cancelled) return;
      setNews(d);
      setNewsLoading(false);
    });
    if (cachedBriefing) {
      setBriefing(cachedBriefing);
      setBriefingLoading(false);
    } else {
      void getJson<BriefingData>("/api/market/briefing").then((d) => {
        if (cancelled) return;
        if (d) cachedBriefing = d;
        setBriefing(d);
        setBriefingLoading(false);
      });
    }
    void getJson<Sp500Data>("/api/market/sp500").then((d) => {
      if (cancelled) return;
      setSp500(d);
      setSp500Loading(false);
    });
    void getJson<SectorsData>("/api/market/sectors").then((d) => {
      if (cancelled) return;
      setSectors(d);
      setSectorsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Session-aware sections: refetch when sign-in state settles/changes.
  useEffect(() => {
    if (sessionStatus === "loading") return;
    let cancelled = false;
    setMoversLoading(true);
    setEarningsLoading(true);
    void getJson<MoversData>("/api/market/movers").then((d) => {
      if (cancelled) return;
      setMovers(d);
      setMoversLoading(false);
    });
    void getJson<EarningsData>("/api/market/earnings").then((d) => {
      if (cancelled) return;
      setEarnings(d);
      setEarningsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      <header>
        <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-1">
          Markets
        </div>
        <h1 className="text-[24px] font-mono font-bold tracking-wide text-text-primary">
          Market overview
        </h1>
      </header>

      {/* Briefing */}
      <section className="bg-bg-card border border-border rounded-xl px-5 py-4">
        <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-2">
          Market briefing
          {briefing?.asOf ? (
            <span className="ml-2 text-text-muted normal-case tracking-normal">
              · as of {timeAgo(briefing.asOf)}
            </span>
          ) : null}
        </div>
        {briefingLoading ? (
          <Shimmer lines={3} />
        ) : briefing?.briefing ? (
          <p className="text-text-secondary text-[13px] leading-relaxed">
            {briefing.briefing}
          </p>
        ) : (
          <p className="text-text-muted text-[12px] font-mono">
            Briefing unavailable right now.
          </p>
        )}
      </section>

      {/* S&P 500 */}
      <section className="bg-bg-card border border-border rounded-xl px-5 py-4">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono">
            S&amp;P 500
            <span className="ml-2 text-text-muted normal-case tracking-normal">
              · 6-month
            </span>
          </div>
          {sp500 && sp500.level > 0 && (
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-[15px] font-semibold text-text-primary">
                {sp500.level.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className="text-[12px]"
                style={{ color: pctColor(sp500.changePct) }}
              >
                {pct(sp500.changePct)}
              </span>
            </div>
          )}
        </div>
        {sp500Loading ? (
          <div className="h-[96px] rounded bg-[#15182a] animate-pulse" />
        ) : sp500 && sp500.closes.length > 1 ? (
          <LineChart data={sp500.closes} color={pctColor(sp500.changePct)} />
        ) : (
          <p className="text-text-muted text-[12px] font-mono">
            Chart unavailable right now.
          </p>
        )}
      </section>

      {/* Movers */}
      <section>
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-3">
          {movers ? MOVERS_HEADING[movers.scope] : "Movers"}
        </h2>
        {moversLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MoversColumn label="Gainers" rows={[]} loading onOpenTicker={onOpenTicker} />
            <MoversColumn label="Losers" rows={[]} loading onOpenTicker={onOpenTicker} />
          </div>
        ) : movers && (movers.gainers.length > 0 || movers.losers.length > 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MoversColumn
              label="Gainers"
              rows={movers.gainers}
              onOpenTicker={onOpenTicker}
            />
            <MoversColumn
              label="Losers"
              rows={movers.losers}
              onOpenTicker={onOpenTicker}
            />
          </div>
        ) : (
          <div className="text-text-muted text-[12px] font-mono">
            Movers unavailable right now.
          </div>
        )}
      </section>

      {/* Sector heatmap */}
      <section>
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-3">
          Sector performance
        </h2>
        {sectorsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[58px] rounded-lg bg-[#15182a] animate-pulse"
              />
            ))}
          </div>
        ) : sectors && sectors.sectors.length > 0 ? (
          <SectorHeatmap sectors={sectors.sectors} onOpenTicker={onOpenTicker} />
        ) : (
          <div className="text-text-muted text-[12px] font-mono">
            Sector data unavailable right now.
          </div>
        )}
      </section>

      {/* Earnings this week */}
      <section>
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-3">
          {earnings?.scope === "you"
            ? "Your earnings this week"
            : "Earnings this week · notable names"}
        </h2>
        {earningsLoading ? (
          <Shimmer lines={4} />
        ) : earnings && earnings.items.length > 0 ? (
          <EarningsList items={earnings.items} onOpenTicker={onOpenTicker} />
        ) : (
          <div className="text-text-muted text-[12px] font-mono">
            {earnings?.scope === "you"
              ? "No tracked names report this week."
              : "No major earnings this week."}
          </div>
        )}
      </section>

      {/* Headlines */}
      <section>
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-3">
          Headlines
        </h2>
        {newsLoading ? (
          <Shimmer lines={5} />
        ) : news && (news.general.length > 0 || news.sectors.length > 0) ? (
          <div className="flex flex-col gap-4">
            <HeadlineGroup
              label="Market"
              items={news.general}
              onOpenTicker={onOpenTicker}
            />
            {news.sectors.map((s) => (
              <HeadlineGroup
                key={s.etf}
                label={`${s.label} · ${s.etf}`}
                items={s.items}
                onOpenTicker={onOpenTicker}
              />
            ))}
          </div>
        ) : (
          <div className="text-text-muted text-[12px] font-mono">
            Headlines unavailable right now.
          </div>
        )}
      </section>
    </div>
  );
}

function MoversColumn({
  label,
  rows,
  loading,
  onOpenTicker,
}: {
  label: string;
  rows: Mover[];
  loading?: boolean;
  onOpenTicker: (ticker: string) => void;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border text-[9px] font-mono uppercase tracking-[0.12em] text-text-dim">
        {label}
      </div>
      {loading ? (
        <div className="p-4">
          <Shimmer lines={6} />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-3 text-[11px] font-mono text-text-dim">
          {label === "Losers" ? "Nothing down" : "Nothing up"}
        </div>
      ) : (
        rows.map((m, i) => (
          <button
            key={m.ticker}
            onClick={() => onOpenTicker(m.ticker)}
            className={`w-full grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-2.5 text-[12px] font-mono text-left hover:bg-[#15182a] transition-colors ${
              i < rows.length - 1 ? "border-b border-[#0d0f1a]" : ""
            }`}
          >
            <span className="min-w-0">
              <span className="text-text-primary font-semibold">{m.ticker}</span>
              <span className="block text-text-muted text-[10px] truncate">
                {m.name}
              </span>
            </span>
            <span className="text-text-secondary text-right">
              {fmtPrice(m.price)}
            </span>
            <span
              className="text-right w-[72px]"
              style={{ color: pctColor(m.changePct) }}
            >
              {pct(m.changePct)}
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function HeadlineGroup({
  label,
  items,
  onOpenTicker,
}: {
  label: string;
  items: Headline[];
  onOpenTicker: (ticker: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted font-mono mb-1.5">
        {label}
      </div>
      <div className="flex flex-col">
        {items.map((h, i) => (
          <div
            key={`${h.url}-${i}`}
            className="flex items-start gap-2 py-2 border-b border-[#0d0f1a] last:border-0"
          >
            <a
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-text-secondary text-[12.5px] leading-snug hover:text-text-primary transition-colors"
            >
              {h.headline}
            </a>
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              {h.related && /^[A-Z.]{1,6}$/.test(h.related) && (
                <button
                  onClick={() => onOpenTicker(h.related)}
                  className="text-[10px] font-mono text-[#9EC87E] hover:text-text-primary transition-colors"
                  title={`Research ${h.related}`}
                >
                  {h.related} →
                </button>
              )}
              {h.datetime > 0 && (
                <span className="text-[10px] font-mono text-text-dim whitespace-nowrap">
                  {timeAgo(h.datetime * 1000)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectorHeatmap({
  sectors,
  onOpenTicker,
}: {
  sectors: Sector[];
  onOpenTicker: (ticker: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {sectors.map((s) => {
        const mag = Math.min(Math.abs(s.changePct) / 2.5, 1);
        const rgb = s.changePct >= 0 ? "74,222,128" : "248,113,113";
        return (
          <button
            key={s.etf}
            onClick={() => onOpenTicker(s.etf)}
            title={`Research ${s.etf}`}
            className="rounded-lg border px-3 py-2.5 text-left transition-transform hover:-translate-y-0.5"
            style={{
              background: `rgba(${rgb}, ${0.08 + mag * 0.32})`,
              borderColor: `rgba(${rgb}, 0.4)`,
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-text-primary text-[12px] font-mono font-semibold truncate">
                {s.label}
              </span>
              <span className="text-text-dim text-[9px] font-mono shrink-0">
                {s.etf}
              </span>
            </div>
            <div
              className="text-[14px] font-mono font-semibold mt-0.5"
              style={{ color: pctColor(s.changePct) }}
            >
              {pct(s.changePct)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function EarningsList({
  items,
  onOpenTicker,
}: {
  items: EarningsItem[];
  onOpenTicker: (ticker: string) => void;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      {items.map((e, i) => (
        <button
          key={e.symbol}
          onClick={() => onOpenTicker(e.symbol)}
          className={`w-full grid grid-cols-[88px_1fr_auto] gap-3 items-center px-4 py-2.5 text-[12px] font-mono text-left hover:bg-[#15182a] transition-colors ${
            i < items.length - 1 ? "border-b border-[#0d0f1a]" : ""
          }`}
        >
          <span className="text-text-secondary text-[11px]">
            {fmtEarningsDate(e.date)}
          </span>
          <span className="min-w-0">
            <span className="text-text-primary font-semibold">{e.symbol}</span>
            <span className="block text-text-muted text-[10px] truncate">
              {e.name}
              {e.hour && HOUR_LABEL[e.hour] ? ` · ${HOUR_LABEL[e.hour]}` : ""}
            </span>
          </span>
          <span className="text-text-dim text-right text-[11px] whitespace-nowrap">
            {e.epsEstimate != null ? `est ${e.epsEstimate.toFixed(2)}` : "—"}
          </span>
        </button>
      ))}
    </div>
  );
}

function LineChart({ data, color }: { data: number[]; color: string }) {
  const W = 100;
  const H = 30;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`,
    )
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={96}
      aria-hidden="true"
      className="block"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Shimmer({ lines }: { lines: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-[#15182a] animate-pulse"
          style={{ width: `${90 - (i % 3) * 15}%` }}
        />
      ))}
    </div>
  );
}
