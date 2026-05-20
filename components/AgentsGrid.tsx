"use client";

import { useState } from "react";
import { AGENTS, TIER_COLORS } from "@/lib/agents";
import type { Agent } from "@/lib/types";
import CryptoPanel from "./panels/CryptoPanel";
import PredMktPanel from "./panels/PredMktPanel";
import IntelHubPanel from "./panels/IntelHubPanel";
import StandardPanel from "./panels/StandardPanel";

function AgentCard({
  agent,
  onClick,
  selected,
}: {
  agent: Agent;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#0b0d14",
        border: selected ? `1px solid ${agent.color}` : "1px solid #1a1d2e",
      }}
      className="text-left rounded-xl p-4 hover:border-text-muted transition-colors flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <div
          style={{
            background: `${agent.color}22`,
            border: `1px solid ${agent.color}44`,
          }}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
        >
          {agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div
            style={{ color: agent.color }}
            className="text-[13px] font-mono font-semibold truncate"
          >
            {agent.name}
          </div>
          <div className="text-[10px] uppercase tracking-[0.1em] text-text-dim font-mono">
            {agent.vertical}
          </div>
        </div>
      </div>
      <p className="text-[11.5px] text-text-secondary leading-relaxed line-clamp-3">
        {agent.description}
      </p>
      <div className="flex items-center justify-end text-[10px] font-mono">
        <span style={{ color: TIER_COLORS[agent.security_tier] }}>
          {agent.security_tier.split("—")[0].trim()}
        </span>
      </div>
    </button>
  );
}

export default function AgentsGrid() {
  const [selected, setSelected] = useState<Agent | null>(null);

  function renderPanel(agent: Agent) {
    const close = () => setSelected(null);
    if (agent.isCryptoAgent) return <CryptoPanel agent={agent} onClose={close} />;
    if (agent.isPredMktAgent) return <PredMktPanel agent={agent} onClose={close} />;
    if (agent.isIntelHub) return <IntelHubPanel agent={agent} onClose={close} />;
    return <StandardPanel agent={agent} onClose={close} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {selected ? (
        <div className="h-full">{renderPanel(selected)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.slug}
              agent={agent}
              onClick={() => setSelected(agent)}
              selected={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
