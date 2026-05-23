"use client";

import { getAgent } from "@/lib/agents";
import type { AgentFinding, AgentSignal } from "@/lib/types";

const STATUS_LABEL: Record<AgentFinding["status"], string> = {
  running: "Running…",
  done: "Done",
  idle: "Idle",
  error: "Error",
};

const SIGNAL_COLOR: Record<AgentSignal, string> = {
  BULLISH: "#4ade80",
  NEUTRAL: "#fbbf24",
  BEARISH: "#f87171",
};

function statusStyle(status: AgentFinding["status"]) {
  switch (status) {
    case "done":
      return { bg: "#0e2b1a", fg: "#4ade80" };
    case "running":
      return { bg: "#221a05", fg: "#fbbf24" };
    case "error":
      return { bg: "#2a0d0d", fg: "#f87171" };
    default:
      return { bg: "#1a1d2e", fg: "#8b9ab8" };
  }
}

export default function AgentFindingCard({ finding }: { finding: AgentFinding }) {
  const agent = getAgent(finding.agentSlug);
  const accent = finding.accentColor;
  const status = statusStyle(finding.status);
  const structured =
    finding.status === "done" &&
    (finding.headline || (finding.bullets && finding.bullets.length > 0));

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
        {finding.signal && (
          <span
            className="text-[9px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded-full"
            style={{
              background: `${SIGNAL_COLOR[finding.signal]}1a`,
              color: SIGNAL_COLOR[finding.signal],
              border: `1px solid ${SIGNAL_COLOR[finding.signal]}55`,
            }}
          >
            {finding.signal}
          </span>
        )}
        <span
          className="text-[9px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded-full"
          style={{ background: status.bg, color: status.fg }}
        >
          {STATUS_LABEL[finding.status]}
        </span>
      </div>

      {finding.status === "running" ? (
        <p className="text-[12.5px] leading-relaxed text-text-secondary">
          Gathering data…
        </p>
      ) : structured ? (
        <div className="flex flex-col gap-2.5">
          {finding.headline && (
            <p className="text-[13.5px] font-semibold leading-snug text-text-primary">
              {finding.headline}
            </p>
          )}
          {finding.bullets && finding.bullets.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {finding.bullets.map((b, i) => (
                <li
                  key={i}
                  className="text-[12px] leading-relaxed text-text-secondary flex gap-2"
                >
                  <span
                    style={{ color: accent }}
                    className="mt-[5px] w-1 h-1 rounded-full shrink-0"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-[12.5px] leading-relaxed text-text-primary whitespace-pre-wrap">
          {finding.summary}
        </p>
      )}
    </div>
  );
}
