"use client";

import { getAgent } from "@/lib/agents";
import type { AgentFinding } from "@/lib/types";

const STATUS_LABEL: Record<AgentFinding["status"], string> = {
  running: "Running…",
  done: "Done",
  idle: "Idle",
  error: "Error",
};

export default function AgentFindingCard({ finding }: { finding: AgentFinding }) {
  const agent = getAgent(finding.agentSlug);
  const accent = finding.accentColor;

  return (
    <div
      style={{ borderColor: `${accent}44` }}
      className="bg-bg-card border rounded-xl p-4 flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <div
          style={{
            background: `${accent}22`,
            border: `1px solid ${accent}44`,
            color: accent,
          }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
        >
          {agent?.icon ?? "•"}
        </div>
        <div className="flex-1 min-w-0">
          <div
            style={{ color: accent }}
            className="text-[12px] font-mono font-semibold truncate"
          >
            {finding.agentName}
          </div>
          <div className="text-[10px] uppercase tracking-[0.1em] text-text-dim font-mono">
            {agent?.vertical ?? "Agent"}
          </div>
        </div>
        <span
          className="text-[9px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded-full"
          style={{
            background:
              finding.status === "done"
                ? "#0e2b1a"
                : finding.status === "running"
                ? "#221a05"
                : finding.status === "error"
                ? "#2a0d0d"
                : "#1a1d2e",
            color:
              finding.status === "done"
                ? "#4ade80"
                : finding.status === "running"
                ? "#fbbf24"
                : finding.status === "error"
                ? "#f87171"
                : "#8b9ab8",
          }}
        >
          {STATUS_LABEL[finding.status]}
        </span>
      </div>
      <p className="text-[12.5px] leading-relaxed text-text-primary whitespace-pre-wrap">
        {finding.status === "running" ? "Gathering data…" : finding.summary}
      </p>
    </div>
  );
}
