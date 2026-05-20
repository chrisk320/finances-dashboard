"use client";

import { useEffect, useRef, useState } from "react";
import type { Agent } from "@/lib/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Market = {
  question?: string;
  current_volume_24h?: number;
  winning_side?: string;
  yes_avg_pnl?: number;
  top1_wallet_pct?: number;
  [k: string]: any;
};
type Wallet = {
  wallet?: string;
  tier?: string;
  h_score?: number;
  total_pnl_15d?: number;
  win_rate_pct_15d?: number;
  roi_pct_15d?: number;
  trajectory?: string;
  [k: string]: any;
};
type Trade = {
  proxy_wallet?: string;
  side?: string;
  outcome?: string;
  price?: number;
  size?: number;
  slug?: string;
  [k: string]: any;
};

const PLATFORM_COLORS: Record<string, string> = {
  Kalshi: "#22d3ee",
  Polymarket: "#fb7185",
  Manifold: "#86efac",
};
const TIER_BADGE: Record<string, string> = {
  Elite: "#f59e0b",
  Sharp: "#a78bfa",
  Solid: "#60a5fa",
  Emerging: "#34d399",
};
const TRAJ_ICON: Record<string, string> = {
  improving: "▲",
  stable: "—",
  declining: "▼",
};
const TRAJ_COLOR: Record<string, string> = {
  improving: "#4ade80",
  stable: "#6b7280",
  declining: "#f87171",
};

function shortWallet(w?: string) {
  return w ? `${w.slice(0, 6)}…${w.slice(-4)}` : "—";
}

function fmtDollar(n: number) {
  const abs = Math.abs(n);
  const s = n < 0 ? "-" : "+";
  if (abs >= 1e6) return `${s}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${s}$${(abs / 1e3).toFixed(1)}K`;
  return `${s}$${abs.toFixed(0)}`;
}

async function pmi<T = any>(
  agent_id: number,
  params: Record<string, any>,
  limit = 10
): Promise<T[]> {
  const res = await fetch("/api/pmi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id, params, limit }),
  });
  if (!res.ok) throw new Error(`pmi ${res.status}`);
  const d = await res.json();
  return d?.data?.results ?? d?.results ?? [];
}

export default function PredMktPanel({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"markets" | "wallets" | "trades" | "chat">(
    "markets"
  );
  const [markets, setMarkets] = useState<Market[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState({
    markets: true,
    wallets: true,
    trades: true,
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pmi<Market>(575, { min_volume_24h: "50000", volume_trend: "Spiking" }, 8)
      .then(setMarkets)
      .catch(() => setMarkets([]))
      .finally(() => setLoading((p) => ({ ...p, markets: false })));
    pmi<Wallet>(584, { min_pnl_15d: "1000", sort_by: "h_score" }, 10)
      .then(setWallets)
      .catch(() => setWallets([]))
      .finally(() => setLoading((p) => ({ ...p, wallets: false })));
    const since = String(Math.floor(Date.now() / 1000) - 3600);
    pmi<Trade>(
      556,
      { proxy_wallet: "ALL", condition_id: "ALL", start_time: since },
      25
    )
      .then(setTrades)
      .catch(() => setTrades([]))
      .finally(() => setLoading((p) => ({ ...p, trades: false })));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    const next: ChatMessage[] = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(next);
    setChatLoading(true);
    const ctx = `You are a Prediction Market Intelligence agent with live access to Polymarket and Kalshi data via Heisenberg PMI.

Spiking markets:
${markets
  .slice(0, 5)
  .map(
    (m) =>
      `- "${m.question}" | Vol 24h: $${Number(
        m.current_volume_24h ?? 0
      ).toLocaleString("en-US", { maximumFractionDigits: 0 })} | Winning: ${
        m.winning_side ?? "?"
      } | Whale control: top1=${m.top1_wallet_pct}%`
  )
  .join("\n")}

Top wallets (15d):
${wallets
  .slice(0, 5)
  .map(
    (w) =>
      `- ${shortWallet(w.wallet)} | Tier: ${w.tier} | H-Score: ${
        w.h_score
      } | PnL: $${Number(w.total_pnl_15d ?? 0).toLocaleString(
        "en-US",
        { maximumFractionDigits: 0 }
      )} | Win: ${w.win_rate_pct_15d}% | ROI: ${w.roi_pct_15d}%`
  )
  .join("\n")}

Recent trades:
${trades
  .slice(0, 8)
  .map(
    (t) =>
      `- ${shortWallet(t.proxy_wallet)} ${t.side} ${t.outcome} @ ${(
        (t.price ?? 0) * 100
      ).toFixed(1)}¢ (${(t.size ?? 0).toFixed(2)}) on "${t.slug}"`
  )
  .join("\n")}

Answer concisely. Not financial advice.`;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: ctx,
          messages: next,
          max_tokens: 1000,
        }),
      });
      const data = await res.json();
      const text =
        data.content?.find((b: any) => b.type === "text")?.text ?? "No response.";
      setChatMessages((m) => [...m, { role: "assistant", content: text }]);
    } catch {
      setChatMessages((m) => [...m, { role: "assistant", content: "Error." }]);
    }
    setChatLoading(false);
  }

  const Loader = ({ label }: { label: string }) => (
    <div className="text-[#A78BFA] text-[11px] font-mono p-6 text-center opacity-60">
      ⟳ Loading {label}…
    </div>
  );

  return (
    <div
      style={{
        background: "#0b0d14",
        border: "1px solid #A78BFA44",
        borderRadius: 16,
      }}
      className="h-full flex flex-col overflow-hidden"
    >
      <div className="px-6 pt-6 border-b border-border">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#A78BFA22] border border-[#A78BFA44] flex items-center justify-center text-2xl">
              🎯
            </div>
            <div>
              <div className="text-text-primary text-lg font-mono font-bold">
                Prediction Markets
              </div>
              <div className="text-text-muted text-[11px] font-mono mt-0.5">
                Heisenberg PMI · Polymarket · Kalshi · live
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="border border-border-subtle text-text-secondary w-8 h-8 rounded-lg text-base hover:bg-bg-card"
          >
            ✕
          </button>
        </div>
        <div className="flex">
          {(["markets", "wallets", "trades", "chat"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                borderBottom:
                  tab === t ? "2px solid #A78BFA" : "2px solid transparent",
                color: tab === t ? "#A78BFA" : "#4a5170",
              }}
              className="px-4 py-2 text-xs font-mono uppercase tracking-[0.08em]"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {tab === "markets" && (
          <div className="flex flex-col gap-2">
            {loading.markets ? (
              <Loader label="markets" />
            ) : markets.length === 0 ? (
              <Empty>No spiking markets returned. Check PMI_JWT.</Empty>
            ) : (
              markets.map((m, i) => (
                <div
                  key={i}
                  className="bg-bg-card border border-[#1e2130] rounded-lg p-3"
                >
                  <div className="text-text-primary text-[12px] font-mono font-semibold mb-1">
                    {m.question}
                  </div>
                  <div className="flex gap-3 text-[10px] font-mono text-text-secondary">
                    <span>
                      Vol 24h $
                      {Number(m.current_volume_24h ?? 0).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    {m.winning_side && (
                      <span className="text-[#4ade80]">
                        Side: {m.winning_side}
                      </span>
                    )}
                    {m.top1_wallet_pct != null && (
                      <span className="text-[#f59e0b]">
                        Top1 {m.top1_wallet_pct}%
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "wallets" && (
          <div className="flex flex-col gap-2">
            {loading.wallets ? (
              <Loader label="wallets" />
            ) : wallets.length === 0 ? (
              <Empty>No wallets returned.</Empty>
            ) : (
              wallets.map((w, i) => (
                <div
                  key={i}
                  className="bg-bg-card border border-[#1e2130] rounded-lg p-3 flex items-center gap-3"
                >
                  <span
                    style={{
                      background: `${TIER_BADGE[w.tier ?? ""] ?? "#60a5fa"}22`,
                      color: TIER_BADGE[w.tier ?? ""] ?? "#60a5fa",
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded"
                  >
                    {w.tier ?? "—"}
                  </span>
                  <span className="text-[#c0cce0] text-[11px] font-mono">
                    {shortWallet(w.wallet)}
                  </span>
                  <span className="text-text-muted text-[10px] font-mono">
                    H-Score {w.h_score ?? "—"}
                  </span>
                  <span
                    className="text-[10px] font-mono ml-auto"
                    style={{
                      color:
                        (w.total_pnl_15d ?? 0) >= 0 ? "#4ade80" : "#f87171",
                    }}
                  >
                    {fmtDollar(w.total_pnl_15d ?? 0)} 15d
                  </span>
                  <span
                    style={{ color: TRAJ_COLOR[w.trajectory ?? ""] ?? "#6b7280" }}
                    className="text-[10px] font-mono"
                  >
                    {TRAJ_ICON[w.trajectory ?? ""] ?? "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "trades" && (
          <div className="flex flex-col gap-1">
            {loading.trades ? (
              <Loader label="trades" />
            ) : trades.length === 0 ? (
              <Empty>No recent trades.</Empty>
            ) : (
              trades.map((t, i) => (
                <div
                  key={i}
                  className="bg-bg-card border border-[#1e2130] rounded-md p-2.5 flex items-center gap-3 text-[11px] font-mono"
                >
                  <span className="text-text-muted">
                    {shortWallet(t.proxy_wallet)}
                  </span>
                  <span
                    style={{
                      color: t.side === "BUY" ? "#4ade80" : "#f87171",
                    }}
                  >
                    {t.side}
                  </span>
                  <span className="text-[#c0cce0]">{t.outcome}</span>
                  <span className="text-text-secondary">
                    @ {((t.price ?? 0) * 100).toFixed(1)}¢
                  </span>
                  <span className="text-text-muted ml-auto truncate max-w-[200px]">
                    {t.slug}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "chat" && (
          <div className="flex flex-col h-full min-h-[300px]">
            <div className="flex-1 overflow-auto flex flex-col gap-2.5 mb-3">
              {chatMessages.length === 0 && (
                <div className="text-text-dim text-center pt-8 font-mono text-xs">
                  Ask about live markets, wallets, or smart-money flows.
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    style={{
                      background: msg.role === "user" ? "#2a3050" : "#A78BFA33",
                    }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] shrink-0"
                  >
                    {msg.role === "user" ? "👤" : "🎯"}
                  </div>
                  <div
                    style={{
                      background: msg.role === "user" ? "#1a1d2e" : "#0f1117",
                      border: `1px solid ${
                        msg.role === "user" ? "#2a2d3e" : "#A78BFA33"
                      }`,
                    }}
                    className="rounded-lg px-3.5 py-2.5 max-w-[85%] text-[#c0cce0] text-[12px] leading-relaxed whitespace-pre-wrap"
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-[#A78BFA33] flex items-center justify-center">
                    🎯
                  </div>
                  <div className="bg-bg-card border border-[#A78BFA33] rounded-lg px-3.5 py-2.5 text-[#A78BFA] text-[12px] font-mono">
                    ● ● ●
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Ask about active markets or wallets..."
                className="flex-1 bg-bg-card border border-[#1e2130] rounded-lg px-3.5 py-2.5 text-[#c0cce0] text-[12px] font-mono outline-none focus:border-text-muted"
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                style={{ background: chatLoading ? "#1a1d2e" : "#A78BFA" }}
                className="rounded-lg px-4 py-2.5 text-[#0b0d14] text-[12px] font-mono font-bold disabled:cursor-not-allowed"
              >
                ↑
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-text-muted text-[11px] font-mono p-6 text-center">
      {children}
    </div>
  );
}
