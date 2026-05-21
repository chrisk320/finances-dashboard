import type { Agent } from "./types";

export const AGENTS: Agent[] = [
  {
    slug: "pitch-agent",
    name: "Pitch Builder",
    vertical: "Research & Coverage",
    icon: "📊",
    color: "#C8A97E",
    description:
      "Creates target lists, runs comparables, and drafts pitchbooks for client meetings.",
    skills: ["comps-analysis", "dcf-modeling", "pitchbook-drafting", "buyer-lists"],
    commands: ["/comps", "/dcf", "/one-pager"],
    connectors: ["FactSet", "PitchBook", "S&P Capital IQ"],
    subagents: ["comps-worker", "deck-formatter"],
    security_tier: "Tier 2 — Read + Draft",
  },
  {
    slug: "meeting-prep-agent",
    name: "Meeting Preparer",
    vertical: "Research & Coverage",
    icon: "📋",
    color: "#7EB8C8",
    description: "Assembles client and counterparty briefs before calls and meetings.",
    skills: ["briefing-assembly", "news-synthesis", "filing-review"],
    commands: ["/brief", "/counterparty"],
    connectors: ["MT Newswires", "LSEG", "S&P Capital IQ"],
    subagents: ["news-scraper", "filing-reader"],
    security_tier: "Tier 1 — Read Only",
  },
  {
    slug: "earnings-reviewer",
    name: "Earnings Reviewer",
    vertical: "Research & Coverage",
    icon: "📈",
    color: "#9EC87E",
    description:
      "Reads transcripts and filings, updates models, and flags thesis-relevant changes.",
    skills: ["transcript-parse", "model-update", "thesis-tracking", "earnings-delta"],
    commands: ["/earnings", "/transcript", "/thesis-check"],
    connectors: ["SEC EDGAR", "Aiera", "FactSet"],
    subagents: ["transcript-reader", "model-updater"],
    security_tier: "Tier 2 — Read + Draft",
  },
  {
    slug: "model-builder",
    name: "Model Builder",
    vertical: "Research & Coverage",
    icon: "🔢",
    color: "#C87E9E",
    description:
      "Creates and maintains financial models from filings, data feeds, and analyst inputs.",
    skills: ["3-statement", "dcf-build", "lbo-model", "sensitivity-tables"],
    commands: ["/dcf", "/lbo", "/3-statement"],
    connectors: ["SEC EDGAR", "Daloopa", "FactSet"],
    subagents: ["filing-parser", "formula-checker"],
    security_tier: "Tier 2 — Read + Draft",
  },
  {
    slug: "market-researcher",
    name: "Market Researcher",
    vertical: "Research & Coverage",
    icon: "🌐",
    color: "#9E7EC8",
    description:
      "Tracks sector and issuer developments, synthesizes news, filings, and broker research.",
    skills: ["sector-monitoring", "news-synthesis", "broker-research", "issuer-tracking"],
    commands: ["/sector", "/issuer", "/morning-note"],
    connectors: ["MT Newswires", "LSEG", "Morningstar"],
    subagents: ["news-aggregator", "research-synthesizer"],
    security_tier: "Tier 1 — Read Only",
  },
  {
    slug: "valuation-reviewer",
    name: "Valuation Reviewer",
    vertical: "Finance & Operations",
    icon: "⚖️",
    color: "#C8B77E",
    description:
      "Reviews valuations against comparables, methodology, and internal review standards.",
    skills: ["comps-review", "methodology-check", "qc-valuation"],
    commands: ["/val-review", "/comps-check"],
    connectors: ["PitchBook", "FactSet", "S&P Capital IQ"],
    subagents: ["comps-worker", "methodology-validator"],
    security_tier: "Tier 2 — Read + Draft",
  },
  {
    slug: "gl-reconciler",
    name: "GL Reconciler",
    vertical: "Finance & Operations",
    icon: "🔄",
    color: "#7EC8B8",
    description:
      "Reconciles general ledger accounts, traces breaks, and performs NAV tie-outs.",
    skills: ["gl-recon", "break-tracing", "nav-tieout", "variance-commentary"],
    commands: ["/recon", "/nav", "/breaks"],
    connectors: ["Chronograph", "Internal ERP"],
    subagents: ["break-tracer", "commentary-writer"],
    security_tier: "Tier 3 — Read + Write (scoped)",
  },
  {
    slug: "month-end-closer",
    name: "Month-End Closer",
    vertical: "Finance & Operations",
    icon: "📅",
    color: "#C87E7E",
    description:
      "Executes the month-end closing checklist, prepares accounting entries, and generates closing reports.",
    skills: ["close-checklist", "journal-entries", "close-reporting", "accruals"],
    commands: ["/close", "/accruals", "/close-report"],
    connectors: ["Chronograph", "Internal ERP"],
    subagents: ["checklist-runner", "entry-preparer", "report-writer"],
    security_tier: "Tier 3 — Read + Write (scoped)",
  },
  {
    slug: "statement-auditor",
    name: "Statement Auditor",
    vertical: "Finance & Operations",
    icon: "🔍",
    color: "#7E9EC8",
    description:
      "Reviews financial statements for consistency, completeness, and audit-readiness.",
    skills: ["consistency-check", "completeness-review", "audit-prep"],
    commands: ["/audit", "/statement-check"],
    connectors: ["SEC EDGAR", "Internal ERP"],
    subagents: ["consistency-checker", "footnote-reviewer"],
    security_tier: "Tier 2 — Read + Draft",
  },
  {
    slug: "kyc-screener",
    name: "KYC Screener",
    vertical: "Finance & Operations",
    icon: "🛡️",
    color: "#C8987E",
    description:
      "Assembles entity files, reviews source documents, and packages escalations for compliance review.",
    skills: ["kyc-rules", "doc-parsing", "rules-grid-eval", "escalation-packaging"],
    commands: ["/kyc", "/screen", "/escalate"],
    connectors: ["Dun & Bradstreet", "Internal CRM"],
    subagents: ["doc-parser", "rules-evaluator", "escalation-packager"],
    security_tier: "Tier 3 — Read + Write (scoped)",
  },
  {
    slug: "coingecko-agent",
    name: "Crypto Intelligence",
    vertical: "Crypto & Digital Assets",
    icon: "🦎",
    color: "#F0B429",
    description:
      "Tracks live crypto prices, trending coins, gainers/losers, market dominance, and on-chain metrics via CoinGecko.",
    skills: [
      "price-feeds",
      "trending-analysis",
      "market-dominance",
      "gainers-losers",
      "on-chain-data",
    ],
    commands: ["/price", "/trending", "/gainers", "/dominance", "/search"],
    connectors: ["CoinGecko Pro API", "GeckoTerminal"],
    subagents: ["price-poller", "trend-scanner", "alert-dispatcher"],
    security_tier: "Tier 1 — Read Only",
    isCryptoAgent: true,
  },
  {
    slug: "predmkt-agent",
    name: "Prediction Markets",
    vertical: "Crypto & Digital Assets",
    icon: "🎯",
    color: "#A78BFA",
    description:
      "Monitors prediction market positions across Kalshi, Polymarket & Manifold — tracking wallet activity, probability shifts, and smart-money flows on stocks, crypto, macro, and politics.",
    skills: [
      "wallet-tracker",
      "position-scanner",
      "probability-delta",
      "flow-analysis",
      "market-screener",
    ],
    commands: ["/positions", "/wallets", "/markets", "/flows", "/alert"],
    connectors: ["Kalshi API", "Polymarket", "Manifold Markets", "Heisenberg PMI"],
    subagents: ["wallet-indexer", "flow-aggregator", "alert-dispatcher"],
    security_tier: "Tier 1 — Read Only",
    isPredMktAgent: true,
  },
  {
    slug: "intel-hub",
    name: "Intelligence Hub",
    vertical: "Intelligence",
    icon: "🧠",
    color: "#E879F9",
    description:
      "Synthesizes live data from all connected agents — crypto, prediction markets, and financial signals — into actionable intelligence.",
    skills: [
      "cross-asset-synthesis",
      "signal-detection",
      "briefing-generation",
      "opportunity-scoring",
      "deep-dive-analysis",
    ],
    commands: ["/brief", "/signals", "/dive", "/watchlist", "/edge"],
    connectors: ["CoinGecko", "Heisenberg PMI", "Kalshi", "Polymarket", "SEC EDGAR"],
    subagents: ["data-aggregator", "signal-scorer", "briefing-writer"],
    security_tier: "Tier 1 — Read Only",
    isIntelHub: true,
  },
];

export const STOCK_AUTO_AGENTS = [
  "earnings-reviewer",
  "market-researcher",
  "intel-hub",
] as const;

export const CRYPTO_AUTO_AGENTS = [
  "coingecko-agent",
  "intel-hub",
] as const;

export function getAgent(slug: string): Agent | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

export const TIER_COLORS: Record<string, string> = {
  "Tier 1 — Read Only": "#34d399",
  "Tier 2 — Read + Draft": "#fbbf24",
  "Tier 3 — Read + Write (scoped)": "#f87171",
};
