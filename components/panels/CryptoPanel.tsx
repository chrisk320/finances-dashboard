"use client";

import { useEffect, useRef, useState } from "react";
import Sparkline from "../Sparkline";
import { LIVE_DATA } from "@/lib/cryptoData";
import { fmt, fmtPrice, pct, pctColor } from "@/lib/format";
import type { Agent } from "@/lib/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

const CRYPTO_SYSTEM = `You are the CoinGecko Crypto Intelligence Agent — a real-time crypto market analyst powered by the CoinGecko API.

Live market snapshot (seeded at render time):
- Total Market Cap: $2.77T | 24h change: -1.16%
- BTC dominance: 58.31% | ETH dominance: 9.95%
- 24h Volume: $90.8B | Active coins: 17,409

Top coins: BTC $80,691 (-1.03%), ETH $2,284 (-2.14%), BNB $667 (-0.04%), XRP $1.44 (-2.62%), SOL $94.44 (-2.90%)

Top gainers 24h: BILL +35.3%, UB +25.8%, TEL +22.6%, SKYAI +20.2%, STABLE +18.3%
Top losers 24h: LUNC -10.8%, H -10.0%, FARTCOIN -9.4%, ONDO -9.2%, MON -8.1%

Answer questions about crypto prices, market trends, dominance, notable movers, and Web3/DeFi topics. Be concise and data-driven. Not investment advice.`;

export default function CryptoPanel({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"market" | "gainers" | "chat">("market");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { global: g, topCoins, gainers, losers } = LIVE_DATA;

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
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: CRYPTO_SYSTEM,
          messages: next,
          max_tokens: 1000,
        }),
      });
      const data = await res.json();
      const text =
        data.content?.find((b: any) => b.type === "text")?.text ?? "No response.";
      setChatMessages((m) => [...m, { role: "assistant", content: text }]);
    } catch {
      setChatMessages((m) => [
        ...m,
        { role: "assistant", content: "Error reaching agent." },
      ]);
    }
    setChatLoading(false);
  }

  const stats = [
    {
      label: "Market Cap",
      value: fmt(g.total_market_cap_usd),
      sub: pct(g.market_cap_change_24h),
      subColor: pctColor(g.market_cap_change_24h),
    },
    {
      label: "24h Volume",
      value: fmt(g.volume_24h_usd),
      sub: `${g.active_cryptos.toLocaleString()} coins`,
      subColor: "#6b7a9e",
    },
    {
      label: "BTC Dom",
      value: `${g.btc_dominance.toFixed(1)}%`,
      sub: "Bitcoin",
      subColor: "#F7931A",
    },
    {
      label: "ETH Dom",
      value: `${g.eth_dominance.toFixed(1)}%`,
      sub: "Ethereum",
      subColor: "#627EEA",
    },
  ];

  return (
    <div
      style={{
        background: "#0b0d14",
        border: `1px solid ${agent.color}44`,
        borderRadius: 16,
      }}
      className="h-full flex flex-col overflow-hidden"
    >
      <div className="px-6 pt-6 border-b border-border">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3.5">
            <div
              style={{ background: "#F0B42922", border: "1px solid #F0B42944" }}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            >
              🦎
            </div>
            <div>
              <div className="text-text-primary text-lg font-mono font-bold">
                Crypto Intelligence
              </div>
              <div className="text-text-muted text-[11px] font-mono mt-0.5">
                custom/coingecko-agent/ · CoinGecko Pro
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
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="bg-[#F0B42918] text-[#F0B429] text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-[#F0B42933]">
            Crypto &amp; Digital Assets
          </span>
          <span className="bg-[#34d39918] text-[#34d399] text-[10px] font-mono px-2.5 py-0.5 rounded-full">
            Tier 1 — Read Only
          </span>
          <span className="bg-[#4ade8018] text-[#4ade80] text-[10px] font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
            <span className="live-pulse w-1.5 h-1.5 rounded-full bg-[#4ade80] inline-block" />
            LIVE · CoinGecko
          </span>
        </div>
        <div className="flex">
          {(["market", "gainers", "chat"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                borderBottom:
                  tab === t ? "2px solid #F0B429" : "2px solid transparent",
                color: tab === t ? "#F0B429" : "#4a5170",
              }}
              className="px-4 py-2 text-xs font-mono uppercase tracking-[0.08em]"
            >
              {t === "gainers" ? "gainers / losers" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {tab === "market" && (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-4 gap-2">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="bg-bg-card border border-[#1e2130] rounded-lg px-3 py-2.5"
                >
                  <div className="text-text-primary text-[13px] font-mono font-semibold">
                    {s.value}
                  </div>
                  <div className="text-text-dim text-[9px] font-mono uppercase tracking-[0.1em] mt-0.5">
                    {s.label}
                  </div>
                  <div
                    style={{ color: s.subColor }}
                    className="text-[10px] font-mono mt-1"
                  >
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-bg-panel border border-border rounded-[10px] overflow-hidden">
              <div className="grid grid-cols-[24px_1fr_100px_60px_65px_90px] gap-2 px-3.5 py-2 border-b border-border">
                {["#", "Coin", "Price", "1h", "24h", "7d Trend"].map((h) => (
                  <div
                    key={h}
                    className="text-text-dim text-[9px] font-mono uppercase tracking-[0.1em]"
                  >
                    {h}
                  </div>
                ))}
              </div>
              {topCoins.map((coin, i) => (
                <div
                  key={coin.id}
                  className="grid grid-cols-[24px_1fr_100px_60px_65px_90px] gap-2 px-3.5 py-1.5 border-b border-[#0d0f1a] items-center last:border-b-0"
                >
                  <div className="text-text-dim text-[11px] font-mono">{i + 1}</div>
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coin.image}
                      alt=""
                      width={18}
                      height={18}
                      className="rounded-full"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                    <div>
                      <div className="text-[#c0cce0] text-[11px] font-mono">
                        {coin.symbol.toUpperCase()}
                      </div>
                      <div className="text-text-dim text-[9px] font-mono">
                        {coin.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-text-primary text-[11px] font-mono">
                    {fmtPrice(coin.current_price)}
                  </div>
                  <div
                    style={{
                      color: pctColor(coin.price_change_percentage_1h_in_currency),
                    }}
                    className="text-[10px] font-mono"
                  >
                    {pct(coin.price_change_percentage_1h_in_currency)}
                  </div>
                  <div
                    style={{ color: pctColor(coin.price_change_percentage_24h) }}
                    className="text-[10px] font-mono"
                  >
                    {pct(coin.price_change_percentage_24h)}
                  </div>
                  <Sparkline
                    data={coin.sparkline_in_7d?.price}
                    color={pctColor(coin.price_change_percentage_7d_in_currency)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "gainers" && (
          <div className="grid grid-cols-2 gap-3.5">
            <MoverList
              label="🚀 Top Gainers 24h"
              color="#4ade80"
              borderColor="#0a1a0a"
              items={gainers}
            />
            <MoverList
              label="📉 Top Losers 24h"
              color="#f87171"
              borderColor="#1a0a0a"
              items={losers}
            />
          </div>
        )}

        {tab === "chat" && (
          <div className="flex flex-col h-full min-h-[300px]">
            <div className="flex-1 overflow-auto flex flex-col gap-2.5 mb-3">
              {chatMessages.length === 0 && (
                <div className="text-text-dim text-center pt-7 font-mono text-xs">
                  <div className="text-3xl mb-2 opacity-50">🦎</div>
                  Ask about any coin, market trend, or crypto topic
                  <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                    {[
                      "/trending",
                      "How's BTC doing?",
                      "Top gainers today?",
                      "What's ETH dominance?",
                      "Any DeFi movers?",
                    ].map((s) => (
                      <span
                        key={s}
                        onClick={() => setChatInput(s)}
                        className="bg-[#F0B42918] text-[#F0B429] text-[10px] font-mono px-2.5 py-0.5 rounded cursor-pointer border border-[#F0B42933]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
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
                      background: msg.role === "user" ? "#2a3050" : "#F0B42933",
                    }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] shrink-0"
                  >
                    {msg.role === "user" ? "👤" : "🦎"}
                  </div>
                  <div
                    style={{
                      background: msg.role === "user" ? "#1a1d2e" : "#0f1117",
                      border: `1px solid ${
                        msg.role === "user" ? "#2a2d3e" : "#F0B42933"
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
                  <div className="w-7 h-7 rounded-md bg-[#F0B42933] flex items-center justify-center">
                    🦎
                  </div>
                  <div className="bg-bg-card border border-[#F0B42933] rounded-lg px-3.5 py-2.5 text-[#F0B429] text-[12px] font-mono">
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
                placeholder="Ask about crypto markets..."
                className="flex-1 bg-bg-card border border-[#1e2130] rounded-lg px-3.5 py-2.5 text-[#c0cce0] text-[12px] font-mono outline-none focus:border-text-muted"
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                style={{ background: chatLoading ? "#1a1d2e" : "#F0B429" }}
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

function MoverList({
  label,
  color,
  borderColor,
  items,
}: {
  label: string;
  color: string;
  borderColor: string;
  items: { id: string; image: string; symbol: string; usd: number; usd_24h_change: number }[];
}) {
  return (
    <div>
      <div
        style={{ color }}
        className="text-[10px] font-mono uppercase tracking-[0.12em] mb-2.5"
      >
        {label}
      </div>
      {items.map((c) => (
        <div
          key={c.id}
          style={{ borderColor }}
          className="flex justify-between items-center px-2.5 py-2 bg-bg-card rounded-md mb-1 border"
        >
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.image}
              alt=""
              width={16}
              height={16}
              className="rounded-full"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <div className="text-[#c0cce0] text-[11px] font-mono">
                {c.symbol.toUpperCase()}
              </div>
              <div className="text-text-dim text-[9px] font-mono">
                {fmtPrice(c.usd)}
              </div>
            </div>
          </div>
          <div
            style={{ color }}
            className="text-[11px] font-mono font-semibold"
          >
            {pct(c.usd_24h_change)}
          </div>
        </div>
      ))}
    </div>
  );
}
