"use client";

import { useState } from "react";
import { TIER_COLORS } from "@/lib/agents";
import type { Agent } from "@/lib/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function StandardPanel({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "skills" | "subagents" | "run"
  >("overview");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSend() {
    if (!chatInput.trim() || isLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    const next: ChatMessage[] = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(next);
    setIsLoading(true);
    try {
      const sp = `You are the ${agent.name} agent. ${agent.description} Skills: ${agent.skills.join(
        ", "
      )}. Commands: ${agent.commands.join(
        ", "
      )}. Respond concisely as this specialized financial agent. Outputs are for analyst review and not investment advice.`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: sp,
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
    setIsLoading(false);
  }

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
              style={{
                background: `${agent.color}22`,
                border: `1px solid ${agent.color}44`,
              }}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            >
              {agent.icon}
            </div>
            <div>
              <div className="text-text-primary text-lg font-mono font-bold">
                {agent.name}
              </div>
              <div className="text-text-muted text-[11px] font-mono mt-0.5">
                managed-agent-cookbooks/{agent.slug}/
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
          <span
            style={{
              background: `${agent.color}18`,
              color: agent.color,
              border: `1px solid ${agent.color}33`,
            }}
            className="text-[10px] font-mono px-2.5 py-0.5 rounded-full"
          >
            {agent.vertical}
          </span>
          <span
            style={{
              background: `${TIER_COLORS[agent.security_tier]}18`,
              color: TIER_COLORS[agent.security_tier],
            }}
            className="text-[10px] font-mono px-2.5 py-0.5 rounded-full"
          >
            {agent.security_tier}
          </span>
        </div>
        <div className="flex">
          {(["overview", "skills", "subagents", "run"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                borderBottom:
                  activeTab === tab
                    ? `2px solid ${agent.color}`
                    : "2px solid transparent",
                color: activeTab === tab ? agent.color : "#4a5170",
              }}
              className="px-4 py-2 text-xs font-mono uppercase tracking-[0.08em]"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {activeTab === "overview" && (
          <div className="flex flex-col gap-4">
            <p className="text-text-secondary text-[13px] leading-relaxed">
              {agent.description}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Panel title="Slash Commands">
                {agent.commands.map((cmd) => (
                  <div
                    key={cmd}
                    style={{ color: agent.color }}
                    className="text-xs font-mono mb-1"
                  >
                    {cmd}
                  </div>
                ))}
              </Panel>
              <Panel title="Data Connectors">
                {agent.connectors.map((c) => (
                  <div key={c} className="text-[11px] font-mono text-[#7eb8c8] mb-1">
                    ↗ {c}
                  </div>
                ))}
              </Panel>
            </div>
            <Panel title="Capabilities">
              <div className="flex gap-6">
                <Stat color={agent.color} value={agent.subagents.length} label="subagents" />
                <Stat color="#f0f2f8" value={agent.skills.length} label="skills" />
                <Stat color="#f0f2f8" value={agent.commands.length} label="commands" />
              </div>
            </Panel>
            <div className="bg-[#0a1a0a] border border-[#1a2e1a] rounded-[10px] p-3.5">
              <div className="text-text-muted text-[10px] font-mono uppercase tracking-[0.1em] mb-2">
                Deploy Command
              </div>
              <code className="text-[#9ec87e] text-[11px] font-mono">
                scripts/deploy-managed-agent.sh {agent.slug}
              </code>
            </div>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="flex flex-col gap-2">
            <div className="text-text-muted text-[11px] font-mono mb-1">
              plugins/agent-plugins/{agent.slug}/skills/
            </div>
            {agent.skills.map((skill) => (
              <div
                key={skill}
                className="bg-bg-card border border-[#1e2130] rounded-lg px-4 py-3 flex items-center gap-3"
              >
                <span
                  style={{ background: agent.color }}
                  className="w-1.5 h-1.5 rounded-full"
                />
                <span className="text-[12px] font-mono text-[#b0bcd8]">
                  {skill}.md
                </span>
                <span className="ml-auto text-[10px] font-mono text-text-dim">
                  SKILL
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "subagents" && (
          <div className="flex flex-col gap-2">
            <div className="text-text-muted text-[11px] font-mono mb-1">
              managed-agent-cookbooks/{agent.slug}/subagents/
            </div>
            {agent.subagents.map((sub) => (
              <div
                key={sub}
                className="bg-bg-card border border-[#1e2130] rounded-lg px-4 py-3.5 flex justify-between items-center"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    style={{ background: `${agent.color}22` }}
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                  >
                    ⚙
                  </div>
                  <span className="text-[12px] font-mono text-[#b0bcd8]">
                    {sub}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-text-dim">
                  leaf worker
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "run" && (
          <div className="flex flex-col h-full min-h-[300px]">
            <div className="flex-1 overflow-auto flex flex-col gap-2.5 mb-3">
              {chatMessages.length === 0 && (
                <div className="text-text-dim text-center pt-8 font-mono text-xs">
                  <div className="text-3xl mb-2 opacity-40">{agent.icon}</div>
                  Send a message to run the {agent.name} agent
                  <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                    {agent.commands.map((cmd) => (
                      <span
                        key={cmd}
                        onClick={() => setChatInput(cmd)}
                        style={{
                          background: `${agent.color}18`,
                          color: agent.color,
                          border: `1px solid ${agent.color}33`,
                        }}
                        className="text-[10px] font-mono px-2.5 py-0.5 rounded cursor-pointer"
                      >
                        {cmd}
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
                      background:
                        msg.role === "user" ? "#2a3050" : `${agent.color}33`,
                    }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0"
                  >
                    {msg.role === "user" ? "👤" : agent.icon}
                  </div>
                  <div
                    style={{
                      background: msg.role === "user" ? "#1a1d2e" : "#0f1117",
                      border: `1px solid ${
                        msg.role === "user" ? "#2a2d3e" : agent.color + "33"
                      }`,
                    }}
                    className="rounded-lg px-3.5 py-2.5 max-w-[85%] text-[12px] leading-relaxed text-[#c0cce0] whitespace-pre-wrap"
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2.5">
                  <div
                    style={{ background: `${agent.color}33` }}
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                  >
                    {agent.icon}
                  </div>
                  <div
                    style={{ border: `1px solid ${agent.color}33`, color: agent.color }}
                    className="bg-bg-card rounded-lg px-3.5 py-2.5 text-[12px] font-mono"
                  >
                    ● ● ●
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={`Steer ${agent.name}...`}
                className="flex-1 bg-bg-card border border-[#1e2130] rounded-lg px-3.5 py-2.5 text-[#c0cce0] text-[12px] font-mono outline-none focus:border-text-muted"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !chatInput.trim()}
                style={{
                  background: isLoading ? "#1a1d2e" : agent.color,
                  color: "#0b0d14",
                }}
                className="rounded-lg px-4 py-2.5 text-[12px] font-mono font-bold disabled:cursor-not-allowed"
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

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-card border border-[#1e2130] rounded-[10px] p-3.5">
      <div className="text-text-muted text-[10px] font-mono uppercase tracking-[0.1em] mb-2.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function Stat({
  color,
  value,
  label,
}: {
  color: string;
  value: number;
  label: string;
}) {
  return (
    <div>
      <div
        style={{ color }}
        className="text-2xl font-mono font-bold"
      >
        {value}
      </div>
      <div className="text-text-muted text-[10px] font-mono">{label}</div>
    </div>
  );
}
