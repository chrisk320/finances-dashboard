"use client";

import { AGENTS } from "@/lib/agents";
import type { AgentStatus, AssetMode, RunStatus } from "@/lib/types";

const DOT_COLOR: Record<AgentStatus, string> = {
  running: "#fbbf24",
  done: "#4ade80",
  idle: "#2a3050",
  error: "#f87171",
};

const AUTO_STOCK = ["earnings-reviewer", "market-researcher", "predmkt-agent", "intel-hub"];
const AUTO_CRYPTO = ["coingecko-agent", "predmkt-agent", "intel-hub"];

export default function AgentStatusList({
  mode,
  status,
}: {
  mode: AssetMode;
  status: RunStatus;
}) {
  const auto = mode === "crypto" ? AUTO_CRYPTO : AUTO_STOCK;
  const autoAgents = auto
    .map((slug) => AGENTS.find((a) => a.slug === slug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const idle = AGENTS.filter((a) => !auto.includes(a.slug));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-text-dim mb-2 font-mono">
          Agent Run
        </div>
        <div className="flex flex-col gap-1">
          {autoAgents.map((agent) => {
            const s = status[agent.slug] ?? "idle";
            return (
              <div
                key={agent.slug}
                className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-mono"
              >
                <span
                  className={s === "running" ? "pulse-dot" : ""}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: DOT_COLOR[s],
                    display: "inline-block",
                  }}
                />
                <span style={{ color: s === "idle" ? "#4a5170" : "#c0cce0" }}>
                  {agent.name}
                </span>
                {s === "done" && (
                  <span className="ml-auto text-[9px] uppercase text-[#4ade80] tracking-wider">
                    done
                  </span>
                )}
                {s === "error" && (
                  <span className="ml-auto text-[9px] uppercase text-[#f87171] tracking-wider">
                    err
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-text-dim mb-2 font-mono">
          Idle
        </div>
        <div className="flex flex-col gap-1">
          {idle.slice(0, 8).map((agent) => (
            <div
              key={agent.slug}
              className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-mono text-text-dim"
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: "#2a3050",
                  display: "inline-block",
                }}
              />
              <span>{agent.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
