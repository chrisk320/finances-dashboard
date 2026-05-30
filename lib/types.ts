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

export type AgentSignal = "BULLISH" | "NEUTRAL" | "BEARISH";

export type AgentFinding = {
  agentSlug: AgentSlug | string;
  agentName: string;
  accentColor: string;
  status: AgentStatus;
  summary: string;
  headline?: string;
  signal?: AgentSignal;
  bullets?: string[];
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

export type ValuationMetrics = {
  peTTM?: number | null;
  evEbitdaTTM?: number | null;
  psTTM?: number | null;
  fcfMarginTTM?: number | null; // FCF / revenue, %
  roeTTM?: number | null; // %
  debtEquityAnnual?: number | null;
  dividendYieldTTM?: number | null; // %
  week52High?: number | null;
  week52Low?: number | null;
};

export type CryptoMetrics = {
  marketCap?: number | null;
  fullyDilutedValuation?: number | null;
  fdvOverMc?: number | null; // dilution overhang ratio
  totalVolume24h?: number | null;
  volumeOverMc?: number | null; // turnover
};

export type NewsImpact = "positive" | "neutral" | "negative";

export type NewsEvent = {
  title: string;
  source: string;
  url?: string;
  publishedAt?: number;
  scope: "company" | "sector";
  impact: NewsImpact;
  rationale: string;
};

// One curated, explained market headline for the Markets-page AI digest.
export type MarketDigestItem = {
  headline: string;
  url: string;
  source: string;
  datetime: number; // unix seconds
  related: string; // ticker if present, else ""
  impact: NewsImpact;
  whyItMatters: string; // plain-English, < 20 words
};

export type StockResearchResult = {
  ticker: string;
  quote: Quote;
  verdict: Verdict;
  findings: AgentFinding[];
  metrics?: ValuationMetrics;
  newsEvents?: NewsEvent[];
  sectorEtf?: string | null;
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
  metrics?: CryptoMetrics;
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

export type PortfolioHolding = {
  ticker: string;
  shares: number;
  /** Per-share cost basis in USD (what brokers display). */
  costBasis: number;
  addedAt: number;
  notes?: string;
};

export type WatchlistItem = {
  symbol: string;
  mode: AssetMode;
  addedAt: number;
  lastChecked?: number;
  lastVerdict?: Verdict;
  /**
   * Rating the user last saw in-app for this symbol. When this differs from
   * `lastVerdict.rating`, the watchlist row shows a "changed" delta badge.
   */
  lastSeenRating?: Verdict["rating"];
};
