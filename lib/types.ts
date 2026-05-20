export type AgentStatus = "running" | "done" | "idle" | "error";

export type AgentSlug =
  | "earnings-reviewer"
  | "market-researcher"
  | "predmkt-agent"
  | "intel-hub"
  | "coingecko-agent"
  | "model-builder"
  | "valuation-reviewer"
  | "pitch-agent"
  | "kyc-screener"
  | "gl-reconciler"
  | "month-end-closer"
  | "statement-auditor"
  | "meeting-prep-agent";

export type AgentFinding = {
  agentSlug: AgentSlug | string;
  agentName: string;
  accentColor: string;
  status: AgentStatus;
  summary: string;
  raw?: any;
  error?: string;
};

export type Verdict = {
  rating: "STRONG BUY" | "BUY" | "HOLD" | "AVOID";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
};

export type Quote = {
  price: number;
  change: number;
  changePct: number;
};

export type StockResearchResult = {
  ticker: string;
  quote: Quote;
  verdict: Verdict;
  findings: AgentFinding[];
  cachedAt?: number;
};

export type CryptoPriceData = {
  price: number;
  change24h: number;
  marketCap: number;
  sparkline: number[];
};

export type CryptoResearchResult = {
  symbol: string;
  priceData: CryptoPriceData;
  verdict: Verdict;
  findings: AgentFinding[];
  cachedAt?: number;
};

export type Agent = {
  slug: string;
  name: string;
  vertical:
    | "Research & Coverage"
    | "Finance & Operations"
    | "Crypto & Digital Assets"
    | "Intelligence";
  icon: string;
  color: string;
  description: string;
  skills: string[];
  commands: string[];
  connectors: string[];
  subagents: string[];
  security_tier: string;
  isCryptoAgent?: boolean;
  isPredMktAgent?: boolean;
  isIntelHub?: boolean;
};

export type RunStatus = Record<string, AgentStatus>;

export type AssetMode = "stocks" | "crypto";
