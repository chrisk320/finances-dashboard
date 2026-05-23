"use client";

import { useEffect, useRef, useState } from "react";
import AgentStatusList from "./AgentStatusList";
import WatchlistSection from "./WatchlistSection";
import type { AssetMode, RunStatus } from "@/lib/types";

export type Recent = {
  symbol: string;
  mode: AssetMode;
  ts: number;
};

const RECENT_KEY = "research:recent";
const RECENT_MAX = 8;

function loadRecents(): Recent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Recent[];
  } catch {
    return [];
  }
}

function saveRecents(recents: Recent[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
  } catch {}
}

export function pushRecent(symbol: string, mode: AssetMode) {
  const list = loadRecents().filter(
    (r) => !(r.symbol === symbol && r.mode === mode)
  );
  list.unshift({ symbol, mode, ts: Date.now() });
  saveRecents(list.slice(0, RECENT_MAX));
}

export default function SearchSidebar({
  mode,
  status,
  current,
  refreshingSymbol,
  onSearch,
}: {
  mode: AssetMode;
  status: RunStatus;
  current: string | null;
  refreshingSymbol?: string | null;
  onSearch: (symbol: string) => void;
}) {
  const [input, setInput] = useState("");
  const [recents, setRecents] = useState<Recent[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecents(loadRecents());
  }, [current]);

  useEffect(() => {
    const onStorage = () => setRecents(loadRecents());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim().toUpperCase();
    if (!v) return;
    onSearch(v);
    setInput("");
    inputRef.current?.blur();
  }

  const filteredRecents = recents.filter((r) => r.mode === mode);
  const placeholder =
    mode === "crypto" ? "Search a token (e.g. SOL)" : "Search a ticker (e.g. NVDA)";

  return (
    <aside className="w-[260px] shrink-0 border-r border-border bg-bg-panel p-4 flex flex-col gap-5 overflow-y-auto">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-[0.12em] text-text-dim font-mono">
          Search
        </label>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="bg-bg-card border border-border rounded-md px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-text-muted"
          autoComplete="off"
        />
        <button
          type="submit"
          className="text-[10px] uppercase tracking-[0.12em] font-mono text-text-primary bg-border-subtle border border-border-subtle hover:bg-[#34384e] transition-colors rounded-md px-3 py-1.5"
        >
          Run research
        </button>
      </form>

      <WatchlistSection
        mode={mode}
        current={current}
        refreshingSymbol={refreshingSymbol ?? null}
        onOpen={onSearch}
      />

      {filteredRecents.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-text-dim mb-2 font-mono">
            Recent
          </div>
          <div className="flex flex-col gap-1">
            {filteredRecents.map((r) => (
              <button
                key={`${r.mode}:${r.symbol}`}
                onClick={() => onSearch(r.symbol)}
                className={`flex items-center gap-2 text-left px-2 py-1.5 text-[11px] font-mono rounded-md transition-colors ${
                  current === r.symbol
                    ? "bg-bg-card text-text-primary"
                    : "text-text-secondary hover:bg-bg-card"
                }`}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: r.mode === "crypto" ? "#F0B429" : "#9EC87E",
                    display: "inline-block",
                  }}
                />
                {r.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {current && <AgentStatusList mode={mode} status={status} />}
    </aside>
  );
}
