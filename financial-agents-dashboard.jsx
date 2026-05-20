import { useState, useEffect, useRef } from "react";

const AGENTS = [
  { slug: "pitch-agent", name: "Pitch Builder", vertical: "Research & Coverage", icon: "📊", color: "#C8A97E", description: "Creates target lists, runs comparables, and drafts pitchbooks for client meetings.", skills: ["comps-analysis", "dcf-modeling", "pitchbook-drafting", "buyer-lists"], commands: ["/comps", "/dcf", "/one-pager"], connectors: ["FactSet", "PitchBook", "S&P Capital IQ"], subagents: ["comps-worker", "deck-formatter"], security_tier: "Tier 2 — Read + Draft", status: "deployed", lastRun: "2m ago", runsToday: 14 },
  { slug: "meeting-prep-agent", name: "Meeting Preparer", vertical: "Research & Coverage", icon: "📋", color: "#7EB8C8", description: "Assembles client and counterparty briefs before calls and meetings.", skills: ["briefing-assembly", "news-synthesis", "filing-review"], commands: ["/brief", "/counterparty"], connectors: ["MT Newswires", "LSEG", "S&P Capital IQ"], subagents: ["news-scraper", "filing-reader"], security_tier: "Tier 1 — Read Only", status: "deployed", lastRun: "18m ago", runsToday: 7 },
  { slug: "earnings-reviewer", name: "Earnings Reviewer", vertical: "Research & Coverage", icon: "📈", color: "#9EC87E", description: "Reads transcripts and filings, updates models, and flags thesis-relevant changes.", skills: ["transcript-parse", "model-update", "thesis-tracking", "earnings-delta"], commands: ["/earnings", "/transcript", "/thesis-check"], connectors: ["SEC EDGAR", "Aiera", "FactSet"], subagents: ["transcript-reader", "model-updater"], security_tier: "Tier 2 — Read + Draft", status: "deployed", lastRun: "just now", runsToday: 22 },
  { slug: "model-builder", name: "Model Builder", vertical: "Research & Coverage", icon: "🔢", color: "#C87E9E", description: "Creates and maintains financial models from filings, data feeds, and analyst inputs.", skills: ["3-statement", "dcf-build", "lbo-model", "sensitivity-tables"], commands: ["/dcf", "/lbo", "/3-statement"], connectors: ["SEC EDGAR", "Daloopa", "FactSet"], subagents: ["filing-parser", "formula-checker"], security_tier: "Tier 2 — Read + Draft", status: "deployed", lastRun: "34m ago", runsToday: 9 },
  { slug: "market-researcher", name: "Market Researcher", vertical: "Research & Coverage", icon: "🌐", color: "#9E7EC8", description: "Tracks sector and issuer developments, synthesizes news, filings, and broker research.", skills: ["sector-monitoring", "news-synthesis", "broker-research", "issuer-tracking"], commands: ["/sector", "/issuer", "/morning-note"], connectors: ["MT Newswires", "LSEG", "Morningstar"], subagents: ["news-aggregator", "research-synthesizer"], security_tier: "Tier 1 — Read Only", status: "deployed", lastRun: "5m ago", runsToday: 31 },
  { slug: "valuation-reviewer", name: "Valuation Reviewer", vertical: "Finance & Operations", icon: "⚖️", color: "#C8B77E", description: "Reviews valuations against comparables, methodology, and internal review standards.", skills: ["comps-review", "methodology-check", "qc-valuation"], commands: ["/val-review", "/comps-check"], connectors: ["PitchBook", "FactSet", "S&P Capital IQ"], subagents: ["comps-worker", "methodology-validator"], security_tier: "Tier 2 — Read + Draft", status: "idle", lastRun: "2h ago", runsToday: 3 },
  { slug: "gl-reconciler", name: "GL Reconciler", vertical: "Finance & Operations", icon: "🔄", color: "#7EC8B8", description: "Reconciles general ledger accounts, traces breaks, and performs NAV tie-outs.", skills: ["gl-recon", "break-tracing", "nav-tieout", "variance-commentary"], commands: ["/recon", "/nav", "/breaks"], connectors: ["Chronograph", "Internal ERP"], subagents: ["break-tracer", "commentary-writer"], security_tier: "Tier 3 — Read + Write (scoped)", status: "running", lastRun: "running", runsToday: 2 },
  { slug: "month-end-closer", name: "Month-End Closer", vertical: "Finance & Operations", icon: "📅", color: "#C87E7E", description: "Executes the month-end closing checklist, prepares accounting entries, and generates closing reports.", skills: ["close-checklist", "journal-entries", "close-reporting", "accruals"], commands: ["/close", "/accruals", "/close-report"], connectors: ["Chronograph", "Internal ERP"], subagents: ["checklist-runner", "entry-preparer", "report-writer"], security_tier: "Tier 3 — Read + Write (scoped)", status: "idle", lastRun: "3d ago", runsToday: 0 },
  { slug: "statement-auditor", name: "Statement Auditor", vertical: "Finance & Operations", icon: "🔍", color: "#7E9EC8", description: "Reviews financial statements for consistency, completeness, and audit-readiness.", skills: ["consistency-check", "completeness-review", "audit-prep"], commands: ["/audit", "/statement-check"], connectors: ["SEC EDGAR", "Internal ERP"], subagents: ["consistency-checker", "footnote-reviewer"], security_tier: "Tier 2 — Read + Draft", status: "idle", lastRun: "1d ago", runsToday: 1 },
  { slug: "kyc-screener", name: "KYC Screener", vertical: "Finance & Operations", icon: "🛡️", color: "#C8987E", description: "Assembles entity files, reviews source documents, and packages escalations for compliance review.", skills: ["kyc-rules", "doc-parsing", "rules-grid-eval", "escalation-packaging"], commands: ["/kyc", "/screen", "/escalate"], connectors: ["Dun & Bradstreet", "Internal CRM"], subagents: ["doc-parser", "rules-evaluator", "escalation-packager"], security_tier: "Tier 3 — Read + Write (scoped)", status: "deployed", lastRun: "12m ago", runsToday: 18 },
  { slug: "coingecko-agent", name: "Crypto Intelligence", vertical: "Crypto & Digital Assets", icon: "🦎", color: "#F0B429", description: "Tracks live crypto prices, trending coins, gainers/losers, market dominance, and on-chain metrics via CoinGecko.", skills: ["price-feeds", "trending-analysis", "market-dominance", "gainers-losers", "on-chain-data"], commands: ["/price", "/trending", "/gainers", "/dominance", "/search"], connectors: ["CoinGecko Pro API", "GeckoTerminal"], subagents: ["price-poller", "trend-scanner", "alert-dispatcher"], security_tier: "Tier 1 — Read Only", status: "running", lastRun: "live", runsToday: 144, isCryptoAgent: true },
  { slug: "predmkt-agent", name: "Prediction Markets", vertical: "Crypto & Digital Assets", icon: "🎯", color: "#A78BFA", description: "Monitors prediction market positions across Kalshi, Polymarket & Manifold — tracking wallet activity, probability shifts, and smart-money flows on stocks, crypto, macro, and politics.", skills: ["wallet-tracker", "position-scanner", "probability-delta", "flow-analysis", "market-screener"], commands: ["/positions", "/wallets", "/markets", "/flows", "/alert"], connectors: ["Kalshi API", "Polymarket", "Manifold Markets", "Heisenberg PMI"], subagents: ["wallet-indexer", "flow-aggregator", "alert-dispatcher"], security_tier: "Tier 1 — Read Only", status: "deployed", lastRun: "4m ago", runsToday: 89, isPredMktAgent: true },
  { slug: "intel-hub", name: "Intelligence Hub", vertical: "Intelligence", icon: "🧠", color: "#E879F9", description: "Synthesizes live data from all connected agents — crypto, prediction markets, and financial signals — into actionable intelligence: morning briefings, cross-asset signals, and deep-dive recommendations.", skills: ["cross-asset-synthesis", "signal-detection", "briefing-generation", "opportunity-scoring", "deep-dive-analysis"], commands: ["/brief", "/signals", "/dive", "/watchlist", "/edge"], connectors: ["CoinGecko", "Heisenberg PMI", "Kalshi", "Polymarket", "SEC EDGAR"], subagents: ["data-aggregator", "signal-scorer", "briefing-writer"], security_tier: "Tier 1 — Read Only", status: "running", lastRun: "live", runsToday: 312, isIntelHub: true },
];

const STATUS_COLORS = { running: "#4ade80", deployed: "#60a5fa", idle: "#6b7280" };
const STATUS_LABELS = { running: "Running", deployed: "Active", idle: "Idle" };
const TIER_COLORS = { "Tier 1 — Read Only": "#34d399", "Tier 2 — Read + Draft": "#fbbf24", "Tier 3 — Read + Write (scoped)": "#f87171" };

const fmt = (n) => { if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`; if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`; return `$${n.toLocaleString()}`; };
const fmtPrice = (p) => { if (p >= 1000) return `$${p.toLocaleString("en-US",{maximumFractionDigits:0})}`; if (p >= 1) return `$${p.toFixed(2)}`; if (p >= 0.01) return `$${p.toFixed(4)}`; return `$${p.toFixed(8)}`; };
const pct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const pctColor = (n) => n >= 0 ? "#4ade80" : "#f87171";

function Sparkline({ data, color, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*width},${height-((v-min)/range)*height}`).join(" ");
  return <svg width={width} height={height}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}

const LIVE_DATA = {
  global: { total_market_cap_usd: 2772231396322.95, volume_24h_usd: 90811009474.63, market_cap_change_24h: -1.162, btc_dominance: 58.31, eth_dominance: 9.95, active_cryptos: 17409 },
  topCoins: [
    { id:"bitcoin", symbol:"btc", name:"Bitcoin", image:"https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400", current_price:80691, price_change_percentage_1h_in_currency:0.057, price_change_percentage_24h:-1.027, price_change_percentage_7d_in_currency:-0.29, sparkline_in_7d:{price:[81025,81397,81358,81584,81306,81473,81899,81952,82290,82496,82205,81706,81680,81360,81467,81396,80518,80160,79895,79785,80080,79864,79778,79901,79726,79643,80047,79588,80097,80026,80225,80393,80350,80513,80630,80785,80879,80788,80742,80636,80740,80784,80687,80807,80866,80887,81405,81443,81179,80825,80841,80740,80942,81149,81572,81900,81795,81530,81026,81010,80837,80632,80745,80485,80679,80675,80480]} },
    { id:"ethereum", symbol:"eth", name:"Ethereum", image:"https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628", current_price:2284.35, price_change_percentage_1h_in_currency:0.084, price_change_percentage_24h:-2.136, price_change_percentage_7d_in_currency:-3.25, sparkline_in_7d:{price:[2364,2371,2376,2391,2410,2411,2404,2358,2349,2350,2331,2322,2329,2343,2334,2326,2314,2298,2290,2299,2288,2284,2278,2281,2280,2287,2295,2275,2291,2316,2312,2316,2320,2329,2331,2330,2326,2322,2326,2328,2327,2329,2325,2332,2336,2339,2341,2333,2315,2310,2310,2303,2286,2263,2275,2284,2274]} },
    { id:"tether", symbol:"usdt", name:"Tether", image:"https://coin-images.coingecko.com/coins/images/325/large/Tether.png?1696501661", current_price:0.9997, price_change_percentage_1h_in_currency:-0.001, price_change_percentage_24h:0.007, price_change_percentage_7d_in_currency:-0.01, sparkline_in_7d:{price:[1,1,1,1,1,1,1,1,1,1,0.9999,0.9999,0.9999,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0.9998,0.9997,0.9997,0.9997,0.9997,0.9997,0.9997,0.9997]} },
    { id:"binancecoin", symbol:"bnb", name:"BNB", image:"https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970", current_price:667.49, price_change_percentage_1h_in_currency:0.286, price_change_percentage_24h:-0.043, price_change_percentage_7d_in_currency:5.84, sparkline_in_7d:{price:[630,634,635,638,645,651,657,647,648,649,648,647,641,650,648,647,647,643,642,641,643,635,637,638,639,636,639,638,641,643,646,647,649,651,651,655,654,653,651,650,649,648,648,647,648,650,650,651,649,652,662,660,651,665,657,655,651,652,661,662,660,656,660,662,664,666,664]} },
    { id:"ripple", symbol:"xrp", name:"XRP", image:"https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442", current_price:1.44, price_change_percentage_1h_in_currency:0.006, price_change_percentage_24h:-2.617, price_change_percentage_7d_in_currency:1.75, sparkline_in_7d:{price:[1.41,1.42,1.42,1.43,1.44,1.45,1.45,1.42,1.43,1.42,1.42,1.41,1.41,1.42,1.42,1.40,1.39,1.39,1.39,1.38,1.39,1.39,1.39,1.41,1.42,1.42,1.42,1.43,1.43,1.43,1.42,1.42,1.42,1.42,1.43,1.44,1.47,1.50,1.49,1.46,1.47,1.45,1.46,1.46,1.46,1.47,1.49,1.47,1.47,1.47,1.48,1.48,1.47,1.43,1.43,1.42,1.43,1.44,1.44,1.44,1.44]} },
    { id:"solana", symbol:"sol", name:"Solana", image:"https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756", current_price:94.44, price_change_percentage_1h_in_currency:-0.185, price_change_percentage_24h:-2.9, price_change_percentage_7d_in_currency:9.40, sparkline_in_7d:{price:[86,87,87,88,89,89,89,88,89,89,88,88,90,89,89,89,88,88,89,91,92,92,92,93,93,93,93,93,92,93,93,93,94,94,94,93,93,94,94,96,96,96,95,96,95,94,95,95,95,96,97,97,97,98,97,97,97,96,96,96,96,95,95,94,94,94,94]} },
    { id:"tron", symbol:"trx", name:"TRON", image:"https://coin-images.coingecko.com/coins/images/1094/large/photo_2026-04-13_09-59-16.png?1776048311", current_price:0.3488, price_change_percentage_1h_in_currency:-0.161, price_change_percentage_24h:-0.446, price_change_percentage_7d_in_currency:1.27, sparkline_in_7d:{price:[0.345,0.343,0.343,0.344,0.343,0.343,0.343,0.344,0.346,0.346,0.346,0.345,0.344,0.345,0.346,0.348,0.349,0.349,0.349,0.348,0.347,0.348,0.349,0.351,0.350,0.349,0.348,0.349,0.349,0.350,0.351,0.352,0.351,0.351,0.352,0.351,0.350,0.350,0.350,0.350,0.350,0.349,0.349,0.349,0.349,0.349,0.349,0.349,0.348,0.348,0.349,0.349,0.349,0.349,0.349]} },
    { id:"dogecoin", symbol:"doge", name:"Dogecoin", image:"https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409", current_price:0.11029, price_change_percentage_1h_in_currency:0.099, price_change_percentage_24h:-0.944, price_change_percentage_7d_in_currency:-3.89, sparkline_in_7d:{price:[0.114,0.115,0.116,0.117,0.116,0.116,0.113,0.113,0.113,0.112,0.111,0.110,0.111,0.112,0.111,0.111,0.109,0.108,0.108,0.108,0.108,0.107,0.106,0.107,0.107,0.108,0.109,0.109,0.110,0.109,0.110,0.111,0.110,0.110,0.109,0.108,0.108,0.108,0.108,0.111,0.111,0.108,0.111,0.113,0.110,0.110,0.110,0.110,0.111,0.111,0.110,0.111,0.111,0.110,0.109,0.109,0.109]} },
    { id:"usd-coin", symbol:"usdc", name:"USDC", image:"https://coin-images.coingecko.com/coins/images/6319/large/USDC.png?1769615602", current_price:0.9999, price_change_percentage_1h_in_currency:0.006, price_change_percentage_24h:0.006, price_change_percentage_7d_in_currency:0.01, sparkline_in_7d:{price:[1,1,1,1,1,1,1,0.9995,0.9996,0.9996,0.9997,0.9998,0.9999,0.9999,0.9999,0.9998,0.9998,0.9998,0.9999,0.9998,0.9999,0.9998,0.9999,0.9998,0.9999,0.9998,0.9997,0.9998,0.9998,0.9997,0.9997,0.9997,0.9997,0.9998,0.9997,0.9998,0.9998,0.9998,0.9998]} },
    { id:"figure-heloc", symbol:"figr", name:"Figure Heloc", image:"https://coin-images.coingecko.com/coins/images/68480/large/figure.png?1755863954", current_price:1.037, price_change_percentage_1h_in_currency:0, price_change_percentage_24h:0.733, price_change_percentage_7d_in_currency:0.37, sparkline_in_7d:{price:[1.033,1.033,1.033,1.033,1.033,1.033,1.015,1.022,1.020,1.020,1.010,1.018,1.014,1.006,1.003,1.003,1.003,1.003,1.001,1.028,1.028,1.028,1.028,1.028,1,1,1,1.006,1.014,1.039,1.032,1.030,1.030,1.030,1.030,1.031,1.031,1.037,1.037]} },
  ],
  gainers: [
    { id:"billions-network", symbol:"bill", name:"Billions Network", image:"https://coin-images.coingecko.com/coins/images/68464/original/billions.png?1755828007", usd:0.18982, usd_24h_change:35.28 },
    { id:"unibase", symbol:"ub", name:"Unibase", image:"https://coin-images.coingecko.com/coins/images/69108/original/unibase.png?1757501820", usd:0.16930, usd_24h_change:25.78 },
    { id:"telcoin", symbol:"tel", name:"Telcoin", image:"https://coin-images.coingecko.com/coins/images/1899/original/tel.png?1696502892", usd:0.00289, usd_24h_change:22.65 },
    { id:"skyai", symbol:"SKYAI", name:"SkyAI", image:"https://coin-images.coingecko.com/coins/images/55294/original/1.png?1745517593", usd:0.54331, usd_24h_change:20.18 },
    { id:"stable-2", symbol:"stable", name:"Stable", image:"https://coin-images.coingecko.com/coins/images/69242/original/stable-logotype-framed-square-light.png?1762753913", usd:0.04068, usd_24h_change:18.29 },
    { id:"kite-2", symbol:"kite", name:"Kite", image:"https://coin-images.coingecko.com/coins/images/70426/original/KITE-ICON.png?1762328605", usd:0.20379, usd_24h_change:16.04 },
    { id:"injective-protocol", symbol:"inj", name:"Injective", image:"https://coin-images.coingecko.com/coins/images/12882/original/Other_200x200.png?1738782212", usd:4.83044, usd_24h_change:6.23 },
    { id:"near", symbol:"near", name:"NEAR Protocol", image:"https://coin-images.coingecko.com/coins/images/10365/original/near.jpg?1696510367", usd:1.62069, usd_24h_change:5.41 },
    { id:"akash-network", symbol:"akt", name:"Akash Network", image:"https://coin-images.coingecko.com/coins/images/12785/original/akash-logo.png?1696512580", usd:0.89604, usd_24h_change:7.02 },
    { id:"zcash", symbol:"zec", name:"Zcash", image:"https://coin-images.coingecko.com/coins/images/486/original/circle-zcash-color.png?1696501740", usd:581.69, usd_24h_change:3.85 },
  ],
  losers: [
    { id:"terra-luna", symbol:"lunc", name:"Terra Luna Classic", image:"https://coin-images.coingecko.com/coins/images/8284/original/01_LunaClassic_color.png?1696508486", usd:0.0000908, usd_24h_change:-10.77 },
    { id:"humanity", symbol:"h", name:"Humanity", image:"https://coin-images.coingecko.com/coins/images/66811/original/H_tokenLogo_original.png?1750581252", usd:0.24124, usd_24h_change:-10.05 },
    { id:"fartcoin", symbol:"fartcoin", name:"Fartcoin", image:"https://coin-images.coingecko.com/coins/images/50891/original/fart.jpg?1729503972", usd:0.23301, usd_24h_change:-9.38 },
    { id:"ondo-finance", symbol:"ondo", name:"Ondo", image:"https://coin-images.coingecko.com/coins/images/26580/original/ONDO.png?1696525656", usd:0.39041, usd_24h_change:-9.16 },
    { id:"monad", symbol:"MON", name:"Monad", image:"https://coin-images.coingecko.com/coins/images/38927/original/mon.png?1766029057", usd:0.030871, usd_24h_change:-8.07 },
    { id:"sei-network", symbol:"sei", name:"Sei", image:"https://coin-images.coingecko.com/coins/images/28205/original/Sei_Logo_-_Transparent.png?1696527207", usd:0.069690, usd_24h_change:-7.74 },
    { id:"the-open-network", symbol:"ton", name:"Toncoin", image:"https://coin-images.coingecko.com/coins/images/17980/original/photo_2024-09-10_17.09.00.jpeg?1725963446", usd:2.3101, usd_24h_change:-5.84 },
    { id:"virtual-protocol", symbol:"virtual", name:"Virtuals Protocol", image:"https://coin-images.coingecko.com/coins/images/34057/original/LOGOMARK.png?1708356054", usd:0.81684, usd_24h_change:-4.86 },
    { id:"internet-computer", symbol:"icp", name:"Internet Computer", image:"https://coin-images.coingecko.com/coins/images/14495/original/Internet_Computer_logo.png?1696514180", usd:3.17247, usd_24h_change:-4.61 },
    { id:"jupiter-exchange-solana", symbol:"JUP", name:"Jupiter", image:"https://coin-images.coingecko.com/coins/images/34188/original/jup.png?1704266489", usd:0.23566, usd_24h_change:-5.73 },
  ],
};

const CRYPTO_SYSTEM = `You are the CoinGecko Crypto Intelligence Agent — a real-time crypto market analyst powered by the CoinGecko API.

Live market snapshot (seeded at render time):
- Total Market Cap: $2.77T | 24h change: -1.16%
- BTC dominance: 58.31% | ETH dominance: 9.95%
- 24h Volume: $90.8B | Active coins: 17,409

Top coins: BTC $80,691 (-1.03%), ETH $2,284 (-2.14%), BNB $667 (-0.04%), XRP $1.44 (-2.62%), SOL $94.44 (-2.90%)

Top gainers 24h: BILL +35.3%, UB +25.8%, TEL +22.6%, SKYAI +20.2%, STABLE +18.3%
Top losers 24h: LUNC -10.8%, H -10.0%, FARTCOIN -9.4%, ONDO -9.2%, MON -8.1%

Answer questions about crypto prices, market trends, dominance, notable movers, and Web3/DeFi topics. Be concise and data-driven. Not investment advice.`;

function CryptoDetailPanel({ agent, onClose }) {
  const [tab, setTab] = useState("market");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const { global: g, topCoins, gainers, losers } = LIVE_DATA;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput("");
    setChatMessages(m => [...m, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: CRYPTO_SYSTEM, messages: [...chatMessages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: msg }] }) });
      const data = await res.json();
      setChatMessages(m => [...m, { role: "assistant", content: data.content?.find(b => b.type === "text")?.text || "No response." }]);
    } catch { setChatMessages(m => [...m, { role: "assistant", content: "Error reaching agent." }]); }
    setChatLoading(false);
  }

  return (
    <div style={{ background: "#0b0d14", border: "1px solid #F0B42944", borderRadius: "16px", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 24px 0", borderBottom: "1px solid #1a1d2e" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <div style={{ width: "48px", height: "48px", background: "#F0B42922", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", border: "1px solid #F0B42944" }}>🦎</div>
            <div>
              <div style={{ color: "#f0f2f8", fontSize: "18px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>Crypto Intelligence</div>
              <div style={{ color: "#4a5170", fontSize: "11px", fontFamily: "monospace", marginTop: "3px" }}>custom/coingecko-agent/ · CoinGecko Pro</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #2a2d3e", color: "#6b7a9e", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <span style={{ background: "#F0B42918", color: "#F0B429", fontSize: "10px", padding: "3px 10px", borderRadius: "20px", border: "1px solid #F0B42933", fontFamily: "monospace" }}>Crypto &amp; Digital Assets</span>
          <span style={{ background: "#34d39918", color: "#34d399", fontSize: "10px", padding: "3px 10px", borderRadius: "20px", fontFamily: "monospace" }}>Tier 1 — Read Only</span>
          <span style={{ background: "#4ade8018", color: "#4ade80", fontSize: "10px", padding: "3px 10px", borderRadius: "20px", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "#4ade80", animation: "livePulse 1.5s infinite" }} /> LIVE · CoinGecko
          </span>
        </div>
        <div style={{ display: "flex" }}>
          {["market", "gainers / losers", "chat"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: tab === t ? "2px solid #F0B429" : "2px solid transparent", color: tab === t ? "#F0B429" : "#4a5170", padding: "8px 16px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
        {tab === "market" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {[
                { label: "Market Cap", value: fmt(g.total_market_cap_usd), sub: pct(g.market_cap_change_24h), subColor: pctColor(g.market_cap_change_24h) },
                { label: "24h Volume", value: fmt(g.volume_24h_usd), sub: `${g.active_cryptos.toLocaleString()} coins`, subColor: "#6b7a9e" },
                { label: "BTC Dom", value: `${g.btc_dominance.toFixed(1)}%`, sub: "Bitcoin", subColor: "#F7931A" },
                { label: "ETH Dom", value: `${g.eth_dominance.toFixed(1)}%`, sub: "Ethereum", subColor: "#627EEA" },
              ].map(s => (
                <div key={s.label} style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "8px", padding: "10px 12px" }}>
                  <div style={{ color: "#f0f2f8", fontSize: "13px", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{s.value}</div>
                  <div style={{ color: "#3a4060", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>{s.label}</div>
                  <div style={{ color: s.subColor, fontSize: "10px", fontFamily: "monospace", marginTop: "3px" }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#0b0d14", border: "1px solid #1a1d2e", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 100px 60px 65px 90px", gap: "8px", padding: "8px 14px", borderBottom: "1px solid #1a1d2e" }}>
                {["#", "Coin", "Price", "1h", "24h", "7d Trend"].map(h => (
                  <div key={h} style={{ color: "#2a3050", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</div>
                ))}
              </div>
              {topCoins.map((coin, i) => (
                <div key={coin.id} style={{ display: "grid", gridTemplateColumns: "24px 1fr 100px 60px 65px 90px", gap: "8px", padding: "7px 14px", borderBottom: i < topCoins.length-1 ? "1px solid #0d0f1a" : "none", alignItems: "center" }}>
                  <div style={{ color: "#2a3050", fontSize: "11px", fontFamily: "monospace" }}>{i+1}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <img src={coin.image} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%" }} onError={e => { e.target.style.display="none"; }} />
                    <div>
                      <div style={{ color: "#c0cce0", fontSize: "11px", fontFamily: "monospace" }}>{coin.symbol.toUpperCase()}</div>
                      <div style={{ color: "#3a4060", fontSize: "9px", fontFamily: "monospace" }}>{coin.name}</div>
                    </div>
                  </div>
                  <div style={{ color: "#f0f2f8", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>{fmtPrice(coin.current_price)}</div>
                  <div style={{ color: pctColor(coin.price_change_percentage_1h_in_currency), fontSize: "10px", fontFamily: "monospace" }}>{pct(coin.price_change_percentage_1h_in_currency)}</div>
                  <div style={{ color: pctColor(coin.price_change_percentage_24h), fontSize: "10px", fontFamily: "monospace" }}>{pct(coin.price_change_percentage_24h)}</div>
                  <Sparkline data={coin.sparkline_in_7d?.price} color={pctColor(coin.price_change_percentage_7d_in_currency)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "gainers / losers" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <div style={{ color: "#4ade80", fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>🚀 Top Gainers 24h</div>
              {gainers.map(c => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#0f1117", borderRadius: "6px", marginBottom: "4px", border: "1px solid #0a1a0a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <img src={c.image} alt="" style={{ width: "16px", height: "16px", borderRadius: "50%" }} onError={e => { e.target.style.display="none"; }} />
                    <div>
                      <div style={{ color: "#c0cce0", fontSize: "11px", fontFamily: "monospace" }}>{c.symbol.toUpperCase()}</div>
                      <div style={{ color: "#2a3050", fontSize: "9px", fontFamily: "monospace" }}>{fmtPrice(c.usd)}</div>
                    </div>
                  </div>
                  <div style={{ color: "#4ade80", fontSize: "11px", fontFamily: "monospace", fontWeight: 600 }}>{pct(c.usd_24h_change)}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ color: "#f87171", fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>📉 Top Losers 24h</div>
              {losers.map(c => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#0f1117", borderRadius: "6px", marginBottom: "4px", border: "1px solid #1a0a0a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <img src={c.image} alt="" style={{ width: "16px", height: "16px", borderRadius: "50%" }} onError={e => { e.target.style.display="none"; }} />
                    <div>
                      <div style={{ color: "#c0cce0", fontSize: "11px", fontFamily: "monospace" }}>{c.symbol.toUpperCase()}</div>
                      <div style={{ color: "#2a3050", fontSize: "9px", fontFamily: "monospace" }}>{fmtPrice(c.usd)}</div>
                    </div>
                  </div>
                  <div style={{ color: "#f87171", fontSize: "11px", fontFamily: "monospace", fontWeight: 600 }}>{pct(c.usd_24h_change)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "300px" }}>
            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
              {chatMessages.length === 0 && (
                <div style={{ color: "#2a3050", textAlign: "center", paddingTop: "28px", fontFamily: "monospace", fontSize: "12px" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.5 }}>🦎</div>
                  Ask about any coin, market trend, or crypto topic
                  <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                    {["/trending", "How's BTC doing?", "Top gainers today?", "What's ETH dominance?", "Any DeFi movers?"].map(s => (
                      <span key={s} onClick={() => setChatInput(s)} style={{ background: "#F0B42918", color: "#F0B429", fontSize: "10px", padding: "3px 10px", borderRadius: "4px", cursor: "pointer", border: "1px solid #F0B42933" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: msg.role === "user" ? "#2a3050" : "#F0B42933", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>{msg.role === "user" ? "👤" : "🦎"}</div>
                  <div style={{ background: msg.role === "user" ? "#1a1d2e" : "#0f1117", border: `1px solid ${msg.role === "user" ? "#2a2d3e" : "#F0B42933"}`, borderRadius: "10px", padding: "10px 14px", maxWidth: "85%", color: "#c0cce0", fontSize: "12px", lineHeight: "1.7", fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-wrap" }}>{msg.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "#F0B42933", display: "flex", alignItems: "center", justifyContent: "center" }}>🦎</div>
                  <div style={{ background: "#0f1117", border: "1px solid #F0B42933", borderRadius: "10px", padding: "10px 14px", color: "#F0B429", fontSize: "12px", fontFamily: "monospace" }}>● ● ●</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Ask about crypto markets..." style={{ flex: 1, background: "#0f1117", border: "1px solid #1e2130", borderRadius: "8px", padding: "10px 14px", color: "#c0cce0", fontSize: "12px", fontFamily: "monospace", outline: "none" }} />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ background: chatLoading ? "#1a1d2e" : "#F0B429", border: "none", borderRadius: "8px", padding: "10px 16px", color: "#0b0d14", fontSize: "12px", fontFamily: "monospace", cursor: chatLoading ? "not-allowed" : "pointer", fontWeight: 700 }}>↑</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StandardDetailPanel({ agent, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSend() {
    if (!chatInput.trim() || isLoading) return;
    const msg = chatInput.trim(); setChatInput("");
    setChatMessages(m => [...m, { role: "user", content: msg }]);
    setIsLoading(true);
    try {
      const sp = `You are the ${agent.name} agent. ${agent.description} Skills: ${agent.skills.join(", ")}. Commands: ${agent.commands.join(", ")}. Respond concisely as this specialized financial agent. Outputs are for analyst review and not investment advice.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: sp, messages: [...chatMessages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: msg }] }) });
      const data = await res.json();
      setChatMessages(m => [...m, { role: "assistant", content: data.content?.find(b => b.type === "text")?.text || "No response." }]);
    } catch { setChatMessages(m => [...m, { role: "assistant", content: "Error." }]); }
    setIsLoading(false);
  }

  return (
    <div style={{ background: "#0b0d14", border: `1px solid ${agent.color}44`, borderRadius: "16px", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 24px 0", borderBottom: "1px solid #1a1d2e" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <div style={{ width: "48px", height: "48px", background: `${agent.color}22`, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", border: `1px solid ${agent.color}44` }}>{agent.icon}</div>
            <div>
              <div style={{ color: "#f0f2f8", fontSize: "18px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{agent.name}</div>
              <div style={{ color: "#4a5170", fontSize: "11px", fontFamily: "monospace", marginTop: "3px" }}>managed-agent-cookbooks/{agent.slug}/</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #2a2d3e", color: "#6b7a9e", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <span style={{ background: `${agent.color}18`, color: agent.color, fontSize: "10px", padding: "3px 10px", borderRadius: "20px", border: `1px solid ${agent.color}33`, fontFamily: "monospace" }}>{agent.vertical}</span>
          <span style={{ background: `${TIER_COLORS[agent.security_tier]}18`, color: TIER_COLORS[agent.security_tier], fontSize: "10px", padding: "3px 10px", borderRadius: "20px", fontFamily: "monospace" }}>{agent.security_tier}</span>
          <span style={{ background: `${STATUS_COLORS[agent.status]}18`, color: STATUS_COLORS[agent.status], fontSize: "10px", padding: "3px 10px", borderRadius: "20px", fontFamily: "monospace" }}>{STATUS_LABELS[agent.status]} · last run {agent.lastRun}</span>
        </div>
        <div style={{ display: "flex" }}>
          {["overview", "skills", "subagents", "run"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", borderBottom: activeTab === tab ? `2px solid ${agent.color}` : "2px solid transparent", color: activeTab === tab ? agent.color : "#4a5170", padding: "8px 16px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>{tab}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ color: "#8b9ab8", lineHeight: "1.7", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{agent.description}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "10px", padding: "14px" }}>
                <div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Slash Commands</div>
                {agent.commands.map(cmd => <div key={cmd} style={{ color: agent.color, fontSize: "12px", fontFamily: "monospace", marginBottom: "4px" }}>{cmd}</div>)}
              </div>
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "10px", padding: "14px" }}>
                <div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Data Connectors</div>
                {agent.connectors.map(c => <div key={c} style={{ color: "#7eb8c8", fontSize: "11px", fontFamily: "monospace", marginBottom: "4px" }}>↗ {c}</div>)}
              </div>
            </div>
            <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "10px", padding: "14px" }}>
              <div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Today's Activity</div>
              <div style={{ display: "flex", gap: "24px" }}>
                <div><div style={{ color: agent.color, fontSize: "24px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{agent.runsToday}</div><div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace" }}>runs</div></div>
                <div><div style={{ color: "#f0f2f8", fontSize: "24px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{agent.subagents.length}</div><div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace" }}>subagents</div></div>
                <div><div style={{ color: "#f0f2f8", fontSize: "24px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{agent.skills.length}</div><div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace" }}>skills</div></div>
              </div>
            </div>
            <div style={{ background: "#0a1a0a", border: "1px solid #1a2e1a", borderRadius: "10px", padding: "14px" }}>
              <div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Deploy Command</div>
              <code style={{ color: "#9ec87e", fontSize: "11px", fontFamily: "monospace" }}>scripts/deploy-managed-agent.sh {agent.slug}</code>
            </div>
          </div>
        )}
        {activeTab === "skills" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ color: "#4a5170", fontSize: "11px", fontFamily: "monospace", marginBottom: "4px" }}>plugins/agent-plugins/{agent.slug}/skills/</div>
            {agent.skills.map(skill => (
              <div key={skill} style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: agent.color, flexShrink: 0 }} />
                <span style={{ color: "#b0bcd8", fontSize: "12px", fontFamily: "monospace" }}>{skill}.md</span>
                <span style={{ marginLeft: "auto", color: "#2a3050", fontSize: "10px", fontFamily: "monospace" }}>SKILL</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === "subagents" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ color: "#4a5170", fontSize: "11px", fontFamily: "monospace", marginBottom: "4px" }}>managed-agent-cookbooks/{agent.slug}/subagents/</div>
            {agent.subagents.map(sub => (
              <div key={sub} style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "8px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "28px", height: "28px", background: `${agent.color}22`, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>⚙</div>
                  <span style={{ color: "#b0bcd8", fontSize: "12px", fontFamily: "monospace" }}>{sub}</span>
                </div>
                <span style={{ color: "#2a3050", fontSize: "10px", fontFamily: "monospace" }}>leaf worker</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === "run" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "300px" }}>
            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
              {chatMessages.length === 0 && (
                <div style={{ color: "#2a3050", textAlign: "center", paddingTop: "32px", fontFamily: "monospace", fontSize: "12px" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.4 }}>{agent.icon}</div>
                  Send a message to run the {agent.name} agent
                  <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                    {agent.commands.map(cmd => <span key={cmd} onClick={() => setChatInput(cmd)} style={{ background: `${agent.color}18`, color: agent.color, fontSize: "10px", padding: "3px 10px", borderRadius: "4px", cursor: "pointer", border: `1px solid ${agent.color}33`, fontFamily: "monospace" }}>{cmd}</span>)}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: msg.role === "user" ? "#2a3050" : `${agent.color}33`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>{msg.role === "user" ? "👤" : agent.icon}</div>
                  <div style={{ background: msg.role === "user" ? "#1a1d2e" : "#0f1117", border: `1px solid ${msg.role === "user" ? "#2a2d3e" : agent.color + "33"}`, borderRadius: "10px", padding: "10px 14px", maxWidth: "85%", color: "#c0cce0", fontSize: "12px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{msg.content}</div>
                </div>
              ))}
              {isLoading && <div style={{ display: "flex", gap: "10px" }}><div style={{ width: "26px", height: "26px", borderRadius: "6px", background: `${agent.color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>{agent.icon}</div><div style={{ background: "#0f1117", border: `1px solid ${agent.color}33`, borderRadius: "10px", padding: "10px 14px", color: agent.color, fontSize: "12px", fontFamily: "monospace" }}>● ● ●</div></div>}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder={`Steer ${agent.name}...`} style={{ flex: 1, background: "#0f1117", border: "1px solid #1e2130", borderRadius: "8px", padding: "10px 14px", color: "#c0cce0", fontSize: "12px", fontFamily: "monospace", outline: "none" }} />
              <button onClick={handleSend} disabled={isLoading || !chatInput.trim()} style={{ background: isLoading ? "#1a1d2e" : agent.color, border: "none", borderRadius: "8px", padding: "10px 16px", color: "#0b0d14", fontSize: "12px", fontFamily: "monospace", cursor: isLoading ? "not-allowed" : "pointer", fontWeight: 700 }}>↑</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Prediction Market Live Panel ────────────────────────────────────────────

const PMI_BASE = "https://narrative.agent.heisenberg.so";
const PMI_TOKEN_KEY = "pmi_jwt_token";

function getPmiToken() {
  try { return localStorage.getItem(PMI_TOKEN_KEY) || ""; } catch { return ""; }
}
function savePmiToken(t) {
  try { localStorage.setItem(PMI_TOKEN_KEY, t); } catch {}
}

async function pmiCall(agentId, params, limit = 10, token) {
  const tok = token || getPmiToken();
  if (!tok) throw new Error("NO_TOKEN");
  const res = await fetch(`${PMI_BASE}/api/v1/retrieval/parameterized/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ agent_id: agentId, params, limit, offset: 0 }),
  });
  if (!res.ok) throw new Error(`PMI ${res.status}`);
  const d = await res.json();
  return d?.data?.results ?? [];
}

const PLATFORM_COLORS = { Kalshi: "#22d3ee", Polymarket: "#fb7185", Manifold: "#86efac" };
const TIER_BADGE = { Elite: "#f59e0b", Sharp: "#a78bfa", Solid: "#60a5fa", Emerging: "#34d399" };
const TRAJ_ICON = { improving: "▲", stable: "—", declining: "▼" };
const TRAJ_COLOR = { improving: "#4ade80", stable: "#6b7280", declining: "#f87171" };
const fmtDollar = (n) => { const abs = Math.abs(n); const s = n < 0 ? "-" : "+"; if (abs >= 1e6) return `${s}$${(abs/1e6).toFixed(2)}M`; if (abs >= 1e3) return `${s}$${(abs/1e3).toFixed(1)}K`; return `${s}$${abs.toFixed(0)}`; };
const shortWallet = (w) => w ? `${w.slice(0,6)}…${w.slice(-4)}` : "—";

function PredMktDetailPanel({ agent, onClose }) {
  const [tab, setTab] = useState("markets");
  const [token, setToken] = useState(() => getPmiToken());
  const [tokenInput, setTokenInput] = useState("");
  const [markets, setMarkets] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState({ markets: false, wallets: false, trades: false });
  const [expandedWallet, setExpandedWallet] = useState(null);
  const [walletDetail, setWalletDetail] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  function connectToken(t) {
    const trimmed = t.trim();
    savePmiToken(trimmed);
    setToken(trimmed);
    setTokenInput("");
  }

  function fetchAllData(tok) {
    setLoading({ markets: true, wallets: true, trades: true });
    pmiCall(575, { min_volume_24h: "50000", volume_trend: "Spiking" }, 8, tok)
      .then(r => setMarkets(r)).catch(() => setMarkets([]))
      .finally(() => setLoading(p => ({ ...p, markets: false })));
    pmiCall(584, { min_pnl_15d: "1000", sort_by: "h_score" }, 10, tok)
      .then(r => setWallets(r)).catch(() => setWallets([]))
      .finally(() => setLoading(p => ({ ...p, wallets: false })));
    const since = String(Math.floor(Date.now() / 1000) - 3600);
    pmiCall(556, { proxy_wallet: "ALL", condition_id: "ALL", start_time: since }, 25, tok)
      .then(r => setTrades(r)).catch(() => setTrades([]))
      .finally(() => setLoading(p => ({ ...p, trades: false })));
  }

  useEffect(() => { if (token) fetchAllData(token); }, [token]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  async function loadWalletDetail(wallet) {
    if (walletDetail[wallet]) { setExpandedWallet(wallet); return; }
    try {
      const r = await pmiCall(586, { wallet_address: wallet }, 1, token);
      setWalletDetail(p => ({ ...p, [wallet]: r[0] ?? null }));
    } catch { setWalletDetail(p => ({ ...p, [wallet]: null })); }
    setExpandedWallet(wallet);
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput("");
    setChatMessages(m => [...m, { role: "user", content: msg }]);
    setChatLoading(true);
    const ctx = `You are a Prediction Market Intelligence agent with live access to Polymarket and Kalshi data via the Heisenberg PMI API.

Live spiking markets right now:
${markets.slice(0,5).map(m => `- "${m.question}" | Vol 24h: $${Number(m.current_volume_24h).toLocaleString("en-US",{maximumFractionDigits:0})} | Winning side: ${m.winning_side ?? "?"} | Yes avg PnL: $${Number(m.yes_avg_pnl).toFixed(0)} | Whale control: top1=${m.top1_wallet_pct}%`).join("\n")}

Top wallets by Heisenberg Score (15d):
${wallets.slice(0,5).map(w => `- ${shortWallet(w.wallet)} | Tier: ${w.tier} | H-Score: ${w.h_score} | PnL: $${Number(w.total_pnl_15d).toLocaleString("en-US",{maximumFractionDigits:0})} | Win rate: ${w.win_rate_pct_15d}% | ROI: ${w.roi_pct_15d}% | Trajectory: ${w.trajectory}`).join("\n")}

Recent live trades (last hour):
${trades.slice(0,8).map(t => `- ${shortWallet(t.proxy_wallet)} ${t.side} ${t.outcome} @ ${(t.price*100).toFixed(1)}¢ (${t.size.toFixed(2)} shares) on "${t.slug}"`).join("\n")}

Answer questions about active markets, smart-money wallet rankings, whale positions, trade flow, and prediction market dynamics. Be data-driven and concise. Not financial advice.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: ctx, messages: [...chatMessages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: msg }] }) });
      const data = await res.json();
      setChatMessages(m => [...m, { role: "assistant", content: data.content?.find(b => b.type === "text")?.text || "No response." }]);
    } catch { setChatMessages(m => [...m, { role: "assistant", content: "Error." }]); }
    setChatLoading(false);
  }

  const Loader = ({ label }) => (
    <div style={{ color: "#A78BFA", fontSize: "11px", fontFamily: "monospace", padding: "24px", textAlign: "center", opacity: 0.6 }}>⟳ Loading {label}…</div>
  );

  return (
    <div style={{ background: "#0b0d14", border: "1px solid #A78BFA44", borderRadius: "16px", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "24px 24px 0", borderBottom: "1px solid #1a1d2e" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <div style={{ width: "48px", height: "48px", background: "#A78BFA22", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", border: "1px solid #A78BFA44" }}>🎯</div>
            <div>
              <div style={{ color: "#f0f2f8", fontSize: "18px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>Prediction Markets</div>
              <div style={{ color: "#4a5170", fontSize: "11px", fontFamily: "monospace", marginTop: "3px" }}>Heisenberg PMI · Polymarket · Kalshi · live</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #2a2d3e", color: "#6b7a9e", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <span style={{ background: "#A78BFA18", color: "#A78BFA", fontSize: "10px", padding: "3px 10px", borderRadius: "20px", border: "1px solid #A78BFA33", fontFamily: "monospace" }}>Crypto &amp; Digital Assets</span>
          <span style={{ background: "#34d39918", color: "#34d399", fontSize: "10px", padding: "3px 10px", borderRadius: "20px", fontFamily: "monospace" }}>Tier 1 — Read Only</span>
          {token
            ? <span style={{ background: "#4ade8018", color: "#4ade80", fontSize: "10px", padding: "3px 10px", borderRadius: "20px", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "#4ade80", animation: "livePulse 1.5s infinite" }} /> LIVE · Heisenberg PMI
              </span>
            : <span style={{ background: "#f8717118", color: "#f87171", fontSize: "10px", padding: "3px 10px", borderRadius: "20px", fontFamily: "monospace" }}>⚠ No JWT — paste token below</span>
          }
        </div>
        {!token && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && tokenInput.trim() && connectToken(tokenInput)}
              placeholder="Paste Heisenberg JWT (eyJ…) — get it from narrative.agent.heisenberg.so after login"
              style={{ flex: 1, background: "#0f1117", border: "1px solid #A78BFA44", borderRadius: "6px", padding: "8px 12px", color: "#c0cce0", fontSize: "11px", fontFamily: "monospace", outline: "none" }}
            />
            <button
              onClick={() => tokenInput.trim() && connectToken(tokenInput)}
              style={{ background: "#A78BFA", border: "none", borderRadius: "6px", padding: "8px 14px", color: "#0b0d14", fontSize: "11px", fontFamily: "monospace", cursor: "pointer", fontWeight: 700 }}>
              Connect
            </button>
          </div>
        )}
        {token && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
            <button onClick={() => { savePmiToken(""); setToken(""); setMarkets([]); setWallets([]); setTrades([]); }}
              style={{ background: "none", border: "1px solid #2a2d3e", color: "#4a5170", fontSize: "10px", padding: "3px 10px", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace" }}>
              ✕ disconnect token
            </button>
          </div>
        )}
        <div style={{ display: "flex" }}>
          {["markets", "wallets", "trades", "chat"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: tab === t ? "2px solid #A78BFA" : "2px solid transparent", color: tab === t ? "#A78BFA" : "#4a5170", padding: "8px 16px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

        {/* ── MARKETS TAB ── */}
        {tab === "markets" && (
          loading.markets ? <Loader label="spiking markets" /> :
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              🔥 Spiking by volume — Polymarket live
            </div>
            {markets.map((m, i) => {
              const vol24h = Number(m.current_volume_24h);
              const vol7d = Number(m.current_volume_7d);
              const yesAvgPnl = Number(m.yes_avg_pnl);
              const noAvgPnl = Number(m.no_avg_pnl);
              const winningSide = m.winning_side;
              return (
                <div key={m.condition_id} style={{ background: "#0f1117", border: "1px solid #1a1d2e", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#c0cce0", fontSize: "12px", lineHeight: "1.5", marginBottom: "6px" }}>{m.question}</div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ background: "#fb718518", color: "#fb7185", fontSize: "9px", padding: "2px 7px", borderRadius: "4px", fontFamily: "monospace", border: "1px solid #fb718533" }}>Polymarket</span>
                        {m.whale_control_flag && <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: "9px", padding: "2px 7px", borderRadius: "4px", fontFamily: "monospace" }}>🐋 Whale</span>}
                        {m.squeeze_risk_flag && <span style={{ background: "#f8717118", color: "#f87171", fontSize: "9px", padding: "2px 7px", borderRadius: "4px", fontFamily: "monospace" }}>⚠ Squeeze Risk</span>}
                        <span style={{ color: "#3a4060", fontSize: "9px", fontFamily: "monospace", padding: "2px 0" }}>exp {m.end_date ? new Date(m.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—"}</span>
                      </div>
                    </div>
                    {winningSide && (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ color: "#4a5170", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "3px" }}>Winning $</div>
                        <div style={{ background: winningSide === "Yes" ? "#4ade8022" : "#f8717122", color: winningSide === "Yes" ? "#4ade80" : "#f87171", fontSize: "11px", fontFamily: "monospace", fontWeight: 700, padding: "3px 10px", borderRadius: "5px", border: `1px solid ${winningSide === "Yes" ? "#4ade8033" : "#f8717133"}` }}>{winningSide.toUpperCase()}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                    {[
                      { label: "24h Vol", value: `$${(vol24h/1e6).toFixed(1)}M`, color: "#f0f2f8" },
                      { label: "7d Vol", value: `$${(vol7d/1e6).toFixed(1)}M`, color: "#6b7a9e" },
                      { label: "Yes PnL avg", value: `$${yesAvgPnl.toFixed(0)}`, color: yesAvgPnl >= 0 ? "#4ade80" : "#f87171" },
                      { label: "Top wallet", value: `${m.top1_wallet_pct}%`, color: Number(m.top1_wallet_pct) > 30 ? "#f59e0b" : "#6b7a9e" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#09090f", borderRadius: "6px", padding: "8px 10px" }}>
                        <div style={{ color: s.color, fontSize: "12px", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{s.value}</div>
                        <div style={{ color: "#2a3050", fontSize: "9px", fontFamily: "monospace", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ flex: 1, height: "4px", background: "#1a1d2e", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, Number(m.volume_ratio_24h_to_7d))}%`, background: "linear-gradient(90deg, #A78BFA, #fb7185)", borderRadius: "2px" }} />
                    </div>
                    <span style={{ color: "#A78BFA", fontSize: "9px", fontFamily: "monospace" }}>spike {Number(m.volume_ratio_24h_to_7d).toFixed(0)}% ratio</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── WALLETS TAB ── */}
        {tab === "wallets" && (
          loading.wallets ? <Loader label="leaderboard" /> :
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
              Heisenberg Leaderboard — 15d rolling window, bot-filtered
            </div>
            {wallets.map((w, i) => (
              <div key={w.wallet}>
                <div onClick={() => expandedWallet === w.wallet ? setExpandedWallet(null) : loadWalletDetail(w.wallet)}
                  style={{ background: expandedWallet === w.wallet ? "#A78BFA10" : "#0f1117", border: `1px solid ${expandedWallet === w.wallet ? "#A78BFA44" : "#1a1d2e"}`, borderRadius: "10px", padding: "12px 14px", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ color: "#2a3050", fontSize: "12px", fontFamily: "'DM Mono', monospace", width: "20px" }}>#{w.leaderboard_rank}</div>
                      <div style={{ background: `${TIER_BADGE[w.tier]}22`, color: TIER_BADGE[w.tier], fontSize: "9px", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace", border: `1px solid ${TIER_BADGE[w.tier]}44` }}>{w.tier}</div>
                      <div style={{ color: "#8b9ab8", fontSize: "11px", fontFamily: "monospace" }}>{shortWallet(w.wallet)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: TRAJ_COLOR[w.trajectory], fontSize: "10px", fontFamily: "monospace" }}>{TRAJ_ICON[w.trajectory]} {w.trajectory}</span>
                      <span style={{ color: "#4ade80", fontSize: "13px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{fmtDollar(Number(w.total_pnl_15d))}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
                    {[
                      { label: "H-Score", value: Number(w.h_score).toFixed(1), color: "#A78BFA" },
                      { label: "ROI 15d", value: `${w.roi_pct_15d}%`, color: "#f0f2f8" },
                      { label: "Win Rate", value: `${w.win_rate_pct_15d}%`, color: Number(w.win_rate_pct_15d) >= 55 ? "#4ade80" : "#f0f2f8" },
                      { label: "Sharpe", value: w.sharpe_ratio_15d, color: "#6b7a9e" },
                      { label: "Trades", value: Number(w.total_trades_15d).toLocaleString(), color: "#6b7a9e" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#09090f", borderRadius: "5px", padding: "6px 8px" }}>
                        <div style={{ color: s.color, fontSize: "11px", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{s.value}</div>
                        <div style={{ color: "#2a3050", fontSize: "8px", fontFamily: "monospace", marginTop: "1px", textTransform: "uppercase" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {expandedWallet === w.wallet && walletDetail[w.wallet] && (
                  <div style={{ background: "#08080e", border: "1px solid #A78BFA22", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px 14px" }}>
                    <div style={{ color: "#4a5170", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>All-Time Stats</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                      {[
                        { label: "Total PnL", value: fmtDollar(Number(walletDetail[w.wallet].total_pnl)), color: Number(walletDetail[w.wallet].total_pnl) >= 0 ? "#4ade80" : "#f87171" },
                        { label: "ROI", value: `${Number(walletDetail[w.wallet].roi_pct).toFixed(1)}%`, color: "#f0f2f8" },
                        { label: "Trades", value: Number(walletDetail[w.wallet].total_trades).toLocaleString(), color: "#6b7a9e" },
                        { label: "Avg Trade", value: `$${Number(walletDetail[w.wallet].avg_trade_size).toFixed(0)}`, color: "#6b7a9e" },
                      ].map(s => (
                        <div key={s.label} style={{ background: "#0f1117", borderRadius: "5px", padding: "6px 8px" }}>
                          <div style={{ color: s.color, fontSize: "11px", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{s.value}</div>
                          <div style={{ color: "#2a3050", fontSize: "8px", fontFamily: "monospace", marginTop: "1px", textTransform: "uppercase" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: "8px", color: "#3a4060", fontSize: "10px", fontFamily: "monospace" }}>
                      Avg PnL/trade: <span style={{ color: "#c0cce0" }}>${Number(walletDetail[w.wallet].avg_pnl_per_trade).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── TRADES TAB ── */}
        {tab === "trades" && (
          loading.trades ? <Loader label="live trades" /> :
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            <div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
              Live trade feed — last hour · Polymarket on-chain
            </div>
            <div style={{ background: "#0b0d14", border: "1px solid #1a1d2e", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 50px 70px 70px", gap: "8px", padding: "8px 14px", borderBottom: "1px solid #1a1d2e" }}>
                {["Wallet", "Market", "Side", "Price", "Size"].map(h => (
                  <div key={h} style={{ color: "#2a3050", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</div>
                ))}
              </div>
              {trades.slice(0, 20).map((t, i) => (
                <div key={t.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 50px 70px 70px", gap: "8px", padding: "7px 14px", borderBottom: i < 19 ? "1px solid #0d0f1a" : "none", alignItems: "center" }}>
                  <div style={{ color: "#5a6a8e", fontSize: "10px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortWallet(t.proxy_wallet)}</div>
                  <div style={{ color: "#8b9ab8", fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.slug}>{t.slug?.replace(/-/g, " ").slice(0, 40)}</div>
                  <div>
                    <span style={{ background: t.side === "BUY" ? "#4ade8018" : "#f8717118", color: t.side === "BUY" ? "#4ade80" : "#f87171", fontSize: "9px", padding: "2px 6px", borderRadius: "3px", fontFamily: "monospace" }}>{t.side}</span>
                  </div>
                  <div style={{ color: "#f0f2f8", fontSize: "10px", fontFamily: "'DM Mono', monospace" }}>{(t.price * 100).toFixed(1)}¢</div>
                  <div style={{ color: "#6b7a9e", fontSize: "10px", fontFamily: "'DM Mono', monospace" }}>{t.size.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "300px" }}>
            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
              {chatMessages.length === 0 && (
                <div style={{ color: "#2a3050", textAlign: "center", paddingTop: "28px", fontFamily: "monospace", fontSize: "12px" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.5 }}>🎯</div>
                  Ask about live markets, top wallets, or smart-money signals
                  <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                    {["Who's the #1 wallet?", "What's spiking right now?", "Any whale-controlled markets?", "What's the top trade this hour?"].map(s => (
                      <span key={s} onClick={() => setChatInput(s)} style={{ background: "#A78BFA18", color: "#A78BFA", fontSize: "10px", padding: "3px 10px", borderRadius: "4px", cursor: "pointer", border: "1px solid #A78BFA33" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: msg.role === "user" ? "#2a3050" : "#A78BFA33", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>{msg.role === "user" ? "👤" : "🎯"}</div>
                  <div style={{ background: msg.role === "user" ? "#1a1d2e" : "#0f1117", border: `1px solid ${msg.role === "user" ? "#2a2d3e" : "#A78BFA33"}`, borderRadius: "10px", padding: "10px 14px", maxWidth: "85%", color: "#c0cce0", fontSize: "12px", lineHeight: "1.7", fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-wrap" }}>{msg.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "#A78BFA33", display: "flex", alignItems: "center", justifyContent: "center" }}>🎯</div>
                  <div style={{ background: "#0f1117", border: "1px solid #A78BFA33", borderRadius: "10px", padding: "10px 14px", color: "#A78BFA", fontSize: "12px", fontFamily: "monospace" }}>● ● ●</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Ask about prediction markets..." style={{ flex: 1, background: "#0f1117", border: "1px solid #1e2130", borderRadius: "8px", padding: "10px 14px", color: "#c0cce0", fontSize: "12px", fontFamily: "monospace", outline: "none" }} />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ background: chatLoading ? "#1a1d2e" : "#A78BFA", border: "none", borderRadius: "8px", padding: "10px 16px", color: "#0b0d14", fontSize: "12px", fontFamily: "monospace", cursor: chatLoading ? "not-allowed" : "pointer", fontWeight: 700 }}>↑</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// keep legacy mock data stubs so nothing else breaks
const PRED_MARKETS = [
  { id: "pm1", platform: "Kalshi", title: "Will the Fed cut rates before Sep 2026?", category: "Macro", yes: 62, no: 38, volume: 4820000, change24h: +4.1, smart_money: "YES", expires: "Aug 31 2026" },
  { id: "pm2", platform: "Polymarket", title: "Will NVDA close above $160 by end of Q2?", category: "Stocks", yes: 44, no: 56, volume: 2310000, change24h: -3.8, smart_money: "NO", expires: "Jun 30 2026" },
  { id: "pm3", platform: "Polymarket", title: "Will BTC exceed $100K before July 2026?", category: "Crypto", yes: 38, no: 62, volume: 7640000, change24h: -2.1, smart_money: "NO", expires: "Jun 30 2026" },
  { id: "pm4", platform: "Kalshi", title: "Will US CPI come in below 3% for May 2026?", category: "Macro", yes: 71, no: 29, volume: 1950000, change24h: +1.9, smart_money: "YES", expires: "Jun 12 2026" },
  { id: "pm5", platform: "Polymarket", title: "Will ETH ETF net inflows exceed $500M in May?", category: "Crypto", yes: 55, no: 45, volume: 890000, change24h: +6.3, smart_money: "YES", expires: "May 31 2026" },
  { id: "pm6", platform: "Manifold", title: "Will Apple announce an AI hardware device at WWDC 2026?", category: "Tech", yes: 68, no: 32, volume: 340000, change24h: +2.7, smart_money: "YES", expires: "Jun 15 2026" },
  { id: "pm7", platform: "Kalshi", title: "Will US unemployment exceed 4.5% in June 2026?", category: "Macro", yes: 29, no: 71, volume: 1120000, change24h: -1.2, smart_money: "NO", expires: "Jul 3 2026" },
  { id: "pm8", platform: "Polymarket", title: "Will SOL flip ETH by market cap in 2026?", category: "Crypto", yes: 18, no: 82, volume: 510000, change24h: +0.9, smart_money: "NO", expires: "Dec 31 2026" },
];

const WALLETS = [
  { address: "0x3f4a...c12e", label: "Whale Alpha", pnl30d: +142800, winRate: 74, totalPositions: 18, recentBets: [
    { title: "Fed cut before Sep 2026", side: "YES", size: 48000, platform: "Kalshi", timestamp: "2h ago" },
    { title: "NVDA > $160 Q2", side: "NO", size: 22000, platform: "Polymarket", timestamp: "5h ago" },
    { title: "BTC > $100K Jun 2026", side: "NO", size: 31000, platform: "Polymarket", timestamp: "1d ago" },
  ]},
  { address: "0x9b2c...88af", label: "Macro Desk", pnl30d: +67400, winRate: 61, totalPositions: 41, recentBets: [
    { title: "US CPI below 3% May", side: "YES", size: 15000, platform: "Kalshi", timestamp: "30m ago" },
    { title: "US unemployment > 4.5%", side: "NO", size: 9500, platform: "Kalshi", timestamp: "3h ago" },
  ]},
  { address: "0x71dd...3301", label: "Crypto Arb", pnl30d: +28900, winRate: 58, totalPositions: 63, recentBets: [
    { title: "ETH ETF inflows > $500M", side: "YES", size: 12000, platform: "Polymarket", timestamp: "1h ago" },
    { title: "SOL flip ETH 2026", side: "NO", size: 4000, platform: "Polymarket", timestamp: "6h ago" },
    { title: "BTC > $100K Jun 2026", side: "YES", size: 7500, platform: "Polymarket", timestamp: "2d ago" },
  ]},
  { address: "0xc5e1...fa09", label: "Tech Fund", pnl30d: -11200, winRate: 47, totalPositions: 12, recentBets: [
    { title: "Apple AI hardware WWDC", side: "YES", size: 18000, platform: "Manifold", timestamp: "4h ago" },
    { title: "NVDA > $160 Q2", side: "YES", size: 26000, platform: "Polymarket", timestamp: "1d ago" },
  ]},
];

function ProbBar({ yes, change24h }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ height: "6px", background: "#1a1d2e", borderRadius: "3px", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${yes}%`, background: yes >= 50 ? "#4ade80" : "#f87171", borderRadius: "3px", transition: "width 0.4s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: yes >= 50 ? "#4ade80" : "#f87171", fontSize: "11px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{yes}% YES</span>
        <span style={{ color: change24h >= 0 ? "#4ade80" : "#f87171", fontSize: "10px", fontFamily: "monospace" }}>{change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h)}pp</span>
      </div>
    </div>
  );
}



// ─── Intelligence Hub Panel ───────────────────────────────────────────────────

const FINNHUB = "https://finnhub.io/api/v1";
const FINNHUB_TOKEN_KEY = "finnhub_api_key";

function getFinnhubKey() {
  try { return localStorage.getItem(FINNHUB_TOKEN_KEY) || ""; } catch { return ""; }
}
function saveFinnhubKey(k) {
  try { localStorage.setItem(FINNHUB_TOKEN_KEY, k); } catch {}
}

async function fh(path, key) {
  const k = key || getFinnhubKey();
  if (!k) throw new Error("NO_KEY");
  const res = await fetch(`${FINNHUB}${path}&token=${k}`);
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return res.json();
}

// Long-term investor system prompt
const buildIntelSystem = ({ stocks, earnings, news, pmi, crypto }) => `You are a daily briefing agent for a long-term, buy-and-hold equity investor. Your job is to surface what matters TODAY for someone thinking in years, not days — quality companies at good prices, macro conditions for adding positions, and risks worth monitoring.

Investor profile: Long-term / buy-and-hold. Focused on equities. Not interested in day-trading noise.

## Live Data (fetched now)

### Stock Market (Finnhub)
${stocks}

### Earnings This Week
${earnings}

### Market News (top headlines)
${news}

### Macro Prediction Markets (Heisenberg PMI)
${pmi}

### Crypto Risk Barometer (CoinGecko)
${crypto}

## Your principles
- Filter out short-term noise. Only flag things that change a multi-year thesis or create a meaningful entry opportunity
- Be direct: if conditions don't warrant action, say "hold and wait"
- Signal strength: STRONG / MODERATE / WEAK
- Always include what could go wrong
- Not financial advice — analysis only`;

const WATCHLIST_TICKERS = ["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN", "META", "BRK.B", "JPM", "V", "UNH"];

function IntelHubPanel({ agent, onClose }) {
  const [tab, setTab] = useState("briefing");
  const [finnhubKey, setFinnhubKey] = useState(() => getFinnhubKey());
  const [finnhubKeyInput, setFinnhubKeyInput] = useState("");
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [signals, setSignals] = useState([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [diveInput, setDiveInput] = useState("");
  const [diveQuery, setDiveQuery] = useState("");
  const [diveResult, setDiveResult] = useState(null);
  const [diveLoading, setDiveLoading] = useState(false);

  // Live data state
  const [stockData, setStockData] = useState({});
  const [earningsData, setEarningsData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [pmiContext, setPmiContext] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataStatus, setDataStatus] = useState("idle"); // idle | loading | ready | partial

  function connectFinnhub(k) {
    const trimmed = k.trim();
    saveFinnhubKey(trimmed);
    setFinnhubKey(trimmed);
    setFinnhubKeyInput("");
  }

  useEffect(() => { if (finnhubKey) fetchAllData(finnhubKey); }, [finnhubKey]);

  async function fetchAllData(key) {
    const k = key || finnhubKey;
    if (!k) return;
    setDataStatus("loading");
    const results = {};

    // 1. Fetch quotes for watchlist
    try {
      const quotes = await Promise.all(
        WATCHLIST_TICKERS.map(t => fh(`/quote?symbol=${t}`, k).then(q => ({ ticker: t, ...q })).catch(() => null))
      );
      results.stocks = quotes.filter(Boolean);
      setStockData(Object.fromEntries(results.stocks.map(q => [q.ticker, q])));
    } catch { results.stocks = []; }

    // 2. Earnings calendar — this week
    try {
      const today = new Date();
      const from = today.toISOString().split("T")[0];
      const to = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];
      const cal = await fh(`/calendar/earnings?from=${from}&to=${to}`, k);
      results.earnings = (cal.earningsCalendar || []).slice(0, 15);
      setEarningsData(results.earnings);
    } catch { results.earnings = []; }

    // 3. Market news
    try {
      const news = await fh(`/market-news?category=general`, k);
      results.news = (news || []).slice(0, 8);
      setNewsData(results.news);
    } catch { results.news = []; }

    // 4. PMI data
    try {
      const tok = getPmiToken();
      if (tok) {
        const [mkts, wallets] = await Promise.all([
          pmiCall(575, { min_volume_24h: "50000", volume_trend: "Spiking" }, 5, tok).catch(() => []),
          pmiCall(584, { min_pnl_15d: "1000", sort_by: "h_score" }, 3, tok).catch(() => []),
        ]);
        const macroMkts = mkts.filter(m => /fed|rate|cpi|inflation|recession|gdp|employment/i.test(m.question));
        const mktStr = macroMkts.length
          ? macroMkts.map(m => `- "${m.question}" | ${m.winning_side ?? "?"} winning | Vol: $${(Number(m.current_volume_24h)/1e6).toFixed(1)}M 24h`).join("\n")
          : mkts.slice(0,3).map(m => `- "${m.question}" | ${m.winning_side ?? "?"} winning | Vol: $${(Number(m.current_volume_24h)/1e6).toFixed(1)}M 24h`).join("\n");
        const topWallet = wallets[0];
        results.pmi = `${mktStr}\nTop wallet H-Score: ${topWallet?.h_score ?? "N/A"} | 15d PnL: $${Number(topWallet?.total_pnl_15d ?? 0).toLocaleString("en-US",{maximumFractionDigits:0})} | Trajectory: ${topWallet?.trajectory ?? "N/A"}`;
      } else {
        results.pmi = "(PMI not connected — paste JWT in Prediction Markets agent)";
      }
    } catch { results.pmi = "PMI data unavailable."; }
    setPmiContext(results.pmi);

    setDataLoaded(true);
    setDataStatus("ready");
  }

  function buildDataContext(results) {
    const stockStr = Object.entries(stockData).map(([t, q]) => {
      const chg = q.dp ? `${q.dp > 0 ? "+" : ""}${q.dp.toFixed(2)}%` : "N/A";
      return `${t}: $${q.c?.toFixed(2) ?? "N/A"} (${chg} today)`;
    }).join(", ") || "Stock data unavailable";

    const earningsStr = earningsData.length
      ? earningsData.map(e => `${e.symbol} | ${e.date} | EPS est: ${e.epsEstimate ?? "N/A"} | Rev est: ${e.revenueEstimate ? "$" + (e.revenueEstimate/1e9).toFixed(1) + "B" : "N/A"}`).join("\n")
      : "No major earnings this week";

    const newsStr = newsData.length
      ? newsData.map(n => `- ${n.headline} [${n.source}]`).join("\n")
      : "No news available";

    return buildIntelSystem({
      stocks: stockStr,
      earnings: earningsStr,
      news: newsStr,
      pmi: pmiContext || "(loading)",
      crypto: "BTC $80,691 (-1.0% 24h) | ETH $2,284 (-2.1%) | BTC dominance 58.3% — slight risk-off tone in crypto suggests mild equity caution",
    });
  }

  async function generateBriefing() {
    if (!dataLoaded || briefingLoading) return;
    setBriefingLoading(true); setBriefing(null);
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1800,
          system: buildDataContext(),
          messages: [{ role: "user", content: `Generate my daily briefing for ${today}. I am a long-term buy-and-hold equity investor. Format exactly as:

**MACRO ENVIRONMENT**
2-3 sentences. Is now a good time to be deploying capital, holding, or waiting? What does the macro signal from prediction markets (Fed, CPI, rates) tell a long-term investor?

**EARNINGS THIS WEEK — WHAT TO WATCH**
Flag any companies reporting that a long-term investor should care about. For each: company, date, what the key question is for the long-term thesis. Skip irrelevant small-caps.

**MARKET NEWS THAT MATTERS**
2-3 bullets. Filter the headlines for things that could affect multi-year theses — ignore short-term noise. Note if there's nothing material.

**WATCHLIST CHECK-IN**
From this list — AAPL, MSFT, GOOGL, NVDA, AMZN, META, BRK.B, JPM, V, UNH — flag any that are showing meaningful moves today worth noting for a long-term investor (significant dip = potential entry, significant run = might be extended). Skip flat ones.

**THIS WEEK'S LONG-TERM OPPORTUNITY**
One specific, actionable idea for a buy-and-hold investor. Could be a stock, a sector, or a "wait and watch" call. Include the thesis in 2 sentences and the key risk.

**HOLD AND WAIT RATING**
Simple verdict: DEPLOY CAPITAL / HOLD CURRENT POSITIONS / WAIT FOR BETTER PRICES — with a one-sentence reason.

Be direct. No fluff. Analyst tone. This is not financial advice.` }]
        })
      });
      const data = await res.json();
      setBriefing(data.content?.find(b => b.type === "text")?.text || "Error.");
    } catch { setBriefing("Error connecting to Claude API."); }
    setBriefingLoading(false);
  }

  async function scanSignals() {
    if (!dataLoaded || signalsLoading) return;
    setSignalsLoading(true); setSignals([]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1400,
          system: buildDataContext(),
          messages: [{ role: "user", content: `You are scanning for signals relevant to a long-term buy-and-hold equity investor. Return exactly 5 signals as a JSON array. Each object must have:
- id: 1-5
- type: "EQUITY" | "MACRO" | "EARNINGS" | "SECTOR" | "RISK"
- strength: "STRONG" | "MODERATE" | "WEAK"
- asset: specific ticker, sector, or topic
- signal: one sentence — what is actually happening in the data
- relevance: one sentence — why this matters to a long-term investor specifically
- action: "Consider adding" | "Watch for entry" | "Hold" | "Avoid for now" | "Research further" — with brief note
- timeframe: "This week" | "This month" | "This quarter"
- risk: one sentence on the key downside

Focus on quality: fewer signals, higher conviction. Return ONLY valid JSON array, no markdown.` }]
        })
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "[]";
      setSignals(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch { setSignals([]); }
    setSignalsLoading(false);
  }

  async function deepDive() {
    if (!diveInput.trim() || diveLoading) return;
    const q = diveInput.trim();
    setDiveQuery(q); setDiveInput(""); setDiveResult(null); setDiveLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1800,
          system: buildDataContext(),
          messages: [{ role: "user", content: `Long-term investor deep dive: "${q}"

Analyze from the perspective of a buy-and-hold investor with a 3-10 year horizon. Cover:

**CURRENT STATE**
What does the live data show right now? Price, trend, any relevant news today.

**LONG-TERM THESIS (BULL CASE)**
2-3 sentences. Why would someone hold this for years?

**LONG-TERM THESIS (BEAR CASE)**
2-3 sentences. What could structurally impair the long-term story?

**VALUATION CONTEXT**
Is it cheap, fair, or expensive relative to its history and growth? Use any available data points.

**MACRO / PREDICTION MARKET READ**
Any relevant macro signals from PMI data that affect this asset's long-term outlook?

**ENTRY CONSIDERATIONS**
For a long-term investor: good entry now, wait for a pullback, or avoid? What price level would make it compelling?

**CONFIDENCE**
HIGH / MEDIUM / LOW — and what would change your view.

Dense, grounded in data, no fluff. Not financial advice.` }]
        })
      });
      const data = await res.json();
      setDiveResult(data.content?.find(b => b.type === "text")?.text || "Error.");
    } catch { setDiveResult("Error."); }
    setDiveLoading(false);
  }

  const SIGNAL_COLORS = { STRONG: "#4ade80", MODERATE: "#f59e0b", WEAK: "#6b7280" };
  const TYPE_COLORS = { EQUITY: "#60a5fa", MACRO: "#A78BFA", EARNINGS: "#F0B429", SECTOR: "#34d399", RISK: "#f87171" };

  const statusBadge = {
    idle: { color: "#6b7280", text: "Not loaded" },
    loading: { color: "#f59e0b", text: "Loading data…" },
    ready: { color: "#4ade80", text: "Live data ready" },
    partial: { color: "#f59e0b", text: "Partial data" },
  }[dataStatus];

  // Render a bold-highlighted text block
  function RichText({ text }) {
    if (!text) return null;
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return (
      <div style={{ color: "#c0cce0", fontSize: "13px", lineHeight: "1.85", fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-wrap" }}>
        {parts.map((p, i) => i % 2 === 1
          ? <strong key={i} style={{ color: "#E879F9", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.03em" }}>{p}</strong>
          : <span key={i}>{p}</span>
        )}
      </div>
    );
  }

  // Mini quote card for watchlist tickers
  function QuoteTicker({ ticker }) {
    const q = stockData[ticker];
    if (!q) return null;
    const chg = q.dp ?? 0;
    const color = chg > 1 ? "#4ade80" : chg < -1 ? "#f87171" : "#6b7280";
    return (
      <div style={{ background: "#09090f", borderRadius: "6px", padding: "6px 10px", minWidth: "80px", textAlign: "center" }}>
        <div style={{ color: "#6b7a9e", fontSize: "9px", fontFamily: "monospace" }}>{ticker}</div>
        <div style={{ color: "#f0f2f8", fontSize: "12px", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>${q.c?.toFixed(0) ?? "—"}</div>
        <div style={{ color, fontSize: "10px", fontFamily: "monospace" }}>{chg > 0 ? "+" : ""}{chg?.toFixed(2) ?? "0"}%</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0b0d14", border: "1px solid #E879F944", borderRadius: "16px", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "24px 24px 0", borderBottom: "1px solid #1a1d2e" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <div style={{ width: "48px", height: "48px", background: "#E879F922", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", border: "1px solid #E879F944" }}>🧠</div>
            <div>
              <div style={{ color: "#f0f2f8", fontSize: "18px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>Intelligence Hub</div>
              <div style={{ color: "#4a5170", fontSize: "11px", fontFamily: "monospace", marginTop: "3px" }}>Finnhub · Heisenberg PMI · CoinGecko · Claude</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {finnhubKey
              ? <span style={{ background: `${statusBadge.color}18`, color: statusBadge.color, fontSize: "10px", padding: "3px 10px", borderRadius: "20px", fontFamily: "monospace" }}>
                  {dataStatus === "loading" ? "⟳ " : "● "}{statusBadge.text}
                </span>
              : <span style={{ background: "#f8717118", color: "#f87171", fontSize: "10px", padding: "3px 10px", borderRadius: "20px", fontFamily: "monospace" }}>⚠ No Finnhub key</span>
            }
            <button onClick={() => fetchAllData(finnhubKey)} disabled={!finnhubKey || dataStatus === "loading"} title="Refresh data"
              style={{ background: "none", border: "1px solid #2a2d3e", color: "#6b7a9e", width: "30px", height: "30px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>↺</button>
            <button onClick={onClose} style={{ background: "none", border: "1px solid #2a2d3e", color: "#6b7a9e", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}>✕</button>
          </div>
        </div>

        {/* Finnhub key input — shown when no key stored */}
        {!finnhubKey && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              value={finnhubKeyInput}
              onChange={e => setFinnhubKeyInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && finnhubKeyInput.trim() && connectFinnhub(finnhubKeyInput)}
              placeholder="Paste Finnhub API key — free at finnhub.io/register"
              style={{ flex: 1, background: "#0f1117", border: "1px solid #E879F944", borderRadius: "6px", padding: "8px 12px", color: "#c0cce0", fontSize: "11px", fontFamily: "monospace", outline: "none" }}
            />
            <button
              onClick={() => finnhubKeyInput.trim() && connectFinnhub(finnhubKeyInput)}
              style={{ background: "#E879F9", border: "none", borderRadius: "6px", padding: "8px 14px", color: "#0b0d14", fontSize: "11px", fontFamily: "monospace", cursor: "pointer", fontWeight: 700 }}>
              Connect
            </button>
          </div>
        )}
        {finnhubKey && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
            <button onClick={() => { saveFinnhubKey(""); setFinnhubKey(""); setStockData({}); setEarningsData([]); setNewsData([]); setDataLoaded(false); setDataStatus("idle"); }}
              style={{ background: "none", border: "1px solid #2a2d3e", color: "#4a5170", fontSize: "10px", padding: "3px 10px", borderRadius: "5px", cursor: "pointer", fontFamily: "monospace" }}>
              ✕ disconnect key
            </button>
          </div>
        )}

        {/* Live ticker strip */}
        {Object.keys(stockData).length > 0 && (
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginBottom: "12px", paddingBottom: "2px" }}>
            {WATCHLIST_TICKERS.map(t => <QuoteTicker key={t} ticker={t} />)}
          </div>
        )}

        <div style={{ display: "flex" }}>
          {["briefing", "signals", "deep dive"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: tab === t ? "2px solid #E879F9" : "2px solid transparent", color: tab === t ? "#E879F9" : "#4a5170", padding: "8px 16px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

        {/* ── BRIEFING TAB ── */}
        {tab === "briefing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#f0f2f8", fontSize: "13px", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>Daily Long-Term Briefing</div>
                <div style={{ color: "#4a5170", fontSize: "11px", fontFamily: "monospace", marginTop: "2px" }}>Stocks · Earnings · Macro · Buy-and-hold focus</div>
              </div>
              <button onClick={generateBriefing} disabled={!dataLoaded || briefingLoading}
                style={{ background: briefingLoading || !dataLoaded ? "#1a1d2e" : "linear-gradient(135deg, #E879F9, #A78BFA)", border: "none", borderRadius: "8px", padding: "9px 18px", color: briefingLoading || !dataLoaded ? "#4a5170" : "#0b0d14", fontSize: "12px", fontFamily: "'DM Mono', monospace", cursor: briefingLoading || !dataLoaded ? "not-allowed" : "pointer", fontWeight: 700 }}>
                {briefingLoading ? "⟳ Generating…" : briefing ? "↺ Refresh" : "⚡ Generate"}
              </button>
            </div>

            {/* Earnings this week preview */}
            {earningsData.length > 0 && (
              <div style={{ background: "#0f1117", border: "1px solid #1a1d2e", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ color: "#4a5170", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>📅 Earnings This Week</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {earningsData.slice(0, 10).map((e, i) => (
                    <span key={i} style={{ background: "#1a1d2e", color: "#c0cce0", fontSize: "10px", padding: "3px 9px", borderRadius: "4px", fontFamily: "monospace" }}>
                      {e.symbol} <span style={{ color: "#3a4060" }}>{e.date?.slice(5)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* News headlines preview */}
            {newsData.length > 0 && !briefing && (
              <div style={{ background: "#0f1117", border: "1px solid #1a1d2e", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ color: "#4a5170", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>📰 Market Headlines</div>
                {newsData.slice(0, 5).map((n, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "5px", alignItems: "flex-start" }}>
                    <span style={{ color: "#2a3050", fontSize: "10px", fontFamily: "monospace", flexShrink: 0, marginTop: "1px" }}>—</span>
                    <span style={{ color: "#8b9ab8", fontSize: "11px", lineHeight: "1.4" }}>{n.headline}</span>
                  </div>
                ))}
              </div>
            )}

            {!briefing && !briefingLoading && (
              <div style={{ background: "#0f1117", border: "1px dashed #2a2d3e", borderRadius: "10px", padding: "28px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.4 }}>🧠</div>
                <div style={{ color: "#3a4060", fontSize: "12px", fontFamily: "monospace" }}>
                  {dataLoaded ? "Data loaded — hit Generate for your briefing" : "Loading live data from Finnhub, PMI, and CoinGecko…"}
                </div>
              </div>
            )}

            {briefingLoading && (
              <div style={{ background: "#0f1117", border: "1px solid #E879F922", borderRadius: "10px", padding: "24px", textAlign: "center" }}>
                <div style={{ color: "#E879F9", fontSize: "12px", fontFamily: "monospace" }}>Synthesizing Finnhub + PMI + CoinGecko data with Claude…</div>
              </div>
            )}

            {briefing && (
              <div style={{ background: "#0f1117", border: "1px solid #E879F933", borderRadius: "10px", padding: "20px" }}>
                <div style={{ color: "#4a5170", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "14px", display: "flex", justifyContent: "space-between" }}>
                  <span>Long-Term Brief · {new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span style={{ color: "#E879F966" }}>Finnhub + PMI + CoinGecko</span>
                </div>
                <RichText text={briefing} />
              </div>
            )}
          </div>
        )}

        {/* ── SIGNALS TAB ── */}
        {tab === "signals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#f0f2f8", fontSize: "13px", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>Long-Term Signal Scan</div>
                <div style={{ color: "#4a5170", fontSize: "11px", fontFamily: "monospace", marginTop: "2px" }}>Buy-and-hold relevant signals only — no day-trading noise</div>
              </div>
              <button onClick={scanSignals} disabled={!dataLoaded || signalsLoading}
                style={{ background: signalsLoading || !dataLoaded ? "#1a1d2e" : "linear-gradient(135deg, #E879F9, #A78BFA)", border: "none", borderRadius: "8px", padding: "9px 18px", color: signalsLoading || !dataLoaded ? "#4a5170" : "#0b0d14", fontSize: "12px", fontFamily: "'DM Mono', monospace", cursor: signalsLoading || !dataLoaded ? "not-allowed" : "pointer", fontWeight: 700 }}>
                {signalsLoading ? "⟳ Scanning…" : signals.length ? "↺ Rescan" : "🔍 Scan"}
              </button>
            </div>

            {signals.length === 0 && !signalsLoading && (
              <div style={{ background: "#0f1117", border: "1px dashed #2a2d3e", borderRadius: "10px", padding: "28px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.4 }}>🔍</div>
                <div style={{ color: "#3a4060", fontSize: "12px", fontFamily: "monospace" }}>Scans equity data, earnings, macro PMI signals for long-term investor relevance</div>
              </div>
            )}
            {signalsLoading && (
              <div style={{ background: "#0f1117", border: "1px solid #E879F922", borderRadius: "10px", padding: "24px", textAlign: "center" }}>
                <div style={{ color: "#E879F9", fontSize: "12px", fontFamily: "monospace" }}>Filtering for long-term signals…</div>
              </div>
            )}

            {signals.map(s => (
              <div key={s.id} style={{ background: "#0f1117", border: `1px solid ${SIGNAL_COLORS[s.strength]}33`, borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ background: `${TYPE_COLORS[s.type]}22`, color: TYPE_COLORS[s.type], fontSize: "9px", padding: "2px 7px", borderRadius: "4px", fontFamily: "monospace", border: `1px solid ${TYPE_COLORS[s.type]}33` }}>{s.type}</span>
                    <span style={{ background: `${SIGNAL_COLORS[s.strength]}18`, color: SIGNAL_COLORS[s.strength], fontSize: "9px", padding: "2px 7px", borderRadius: "4px", fontFamily: "monospace" }}>{s.strength}</span>
                    <span style={{ color: "#f0f2f8", fontSize: "12px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{s.asset}</span>
                    <span style={{ color: "#3a4060", fontSize: "9px", fontFamily: "monospace" }}>{s.timeframe}</span>
                  </div>
                </div>
                <div style={{ color: "#c0cce0", fontSize: "12px", lineHeight: "1.5", marginBottom: "6px" }}>{s.signal}</div>
                <div style={{ color: "#8b9ab8", fontSize: "11px", marginBottom: "8px", fontStyle: "italic" }}>{s.relevance}</div>
                <div style={{ background: "#08080e", borderRadius: "6px", padding: "8px 12px", marginBottom: "6px" }}>
                  <span style={{ color: "#E879F9", fontSize: "10px", fontFamily: "monospace", fontWeight: 600 }}>ACTION: </span>
                  <span style={{ color: "#b0bcd8", fontSize: "11px" }}>{s.action}</span>
                </div>
                <div style={{ color: "#f8717166", fontSize: "10px" }}>⚠ {s.risk}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── DEEP DIVE TAB ── */}
        {tab === "deep dive" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <div style={{ color: "#f0f2f8", fontSize: "13px", fontFamily: "'DM Mono', monospace", fontWeight: 600, marginBottom: "4px" }}>Deep Dive — Long-Term View</div>
              <div style={{ color: "#4a5170", fontSize: "11px", fontFamily: "monospace", marginBottom: "12px" }}>Research any stock, sector, or macro topic from a buy-and-hold perspective</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={diveInput} onChange={e => setDiveInput(e.target.value)} onKeyDown={e => e.key === "Enter" && deepDive()}
                  placeholder="e.g. NVDA, Microsoft AI thesis, healthcare sector, Fed rate path…"
                  style={{ flex: 1, background: "#0f1117", border: "1px solid #E879F944", borderRadius: "8px", padding: "10px 14px", color: "#c0cce0", fontSize: "12px", fontFamily: "monospace", outline: "none" }} />
                <button onClick={deepDive} disabled={diveLoading || !diveInput.trim()}
                  style={{ background: diveLoading ? "#1a1d2e" : "linear-gradient(135deg, #E879F9, #A78BFA)", border: "none", borderRadius: "8px", padding: "10px 18px", color: diveLoading ? "#4a5170" : "#0b0d14", fontSize: "12px", fontFamily: "'DM Mono', monospace", cursor: diveLoading ? "not-allowed" : "pointer", fontWeight: 700 }}>
                  {diveLoading ? "⟳" : "Dive →"}
                </button>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                {["NVDA long-term", "MSFT AI thesis", "Is AAPL fairly valued?", "Healthcare sector outlook", "Fed rate path impact on equities"].map(s => (
                  <span key={s} onClick={() => setDiveInput(s)} style={{ background: "#E879F912", color: "#E879F966", fontSize: "10px", padding: "3px 10px", borderRadius: "4px", cursor: "pointer", border: "1px solid #E879F922", fontFamily: "monospace" }}>{s}</span>
                ))}
              </div>
            </div>

            {diveLoading && (
              <div style={{ background: "#0f1117", border: "1px solid #E879F922", borderRadius: "10px", padding: "24px", textAlign: "center" }}>
                <div style={{ color: "#E879F9", fontSize: "12px", fontFamily: "monospace" }}>Researching "{diveQuery}" from a long-term perspective…</div>
              </div>
            )}

            {diveResult && !diveLoading && (
              <div style={{ background: "#0f1117", border: "1px solid #E879F933", borderRadius: "10px", padding: "20px" }}>
                <div style={{ color: "#4a5170", fontSize: "9px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "14px", display: "flex", justifyContent: "space-between" }}>
                  <span>Deep Dive: {diveQuery}</span>
                  <span style={{ color: "#E879F966" }}>long-term · buy-and-hold</span>
                </div>
                <RichText text={diveResult} />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}


function AgentCard({ agent, onClick, selected }) {
  return (
    <div onClick={() => onClick(agent)} style={{ background: selected ? `${agent.color}18` : "#0f1117", border: `1px solid ${selected ? agent.color : "#1e2130"}`, borderRadius: "12px", padding: "20px", cursor: "pointer", transition: "all 0.2s ease", position: "relative", overflow: "hidden" }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.border = `1px solid ${agent.color}88`; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.border = "1px solid #1e2130"; }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: agent.color, opacity: selected ? 1 : 0.4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>{agent.icon}</span>
          <div>
            <div style={{ color: "#f0f2f8", fontFamily: "'DM Mono', monospace", fontSize: "13px", fontWeight: 600 }}>{agent.name}</div>
            <div style={{ color: "#4a5170", fontSize: "10px", fontFamily: "monospace" }}>{agent.slug}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: STATUS_COLORS[agent.status], boxShadow: agent.status === "running" ? `0 0 8px ${STATUS_COLORS[agent.status]}` : "none" }} />
          <span style={{ fontSize: "10px", color: STATUS_COLORS[agent.status], fontFamily: "monospace" }}>{agent.isCryptoAgent ? "Live" : STATUS_LABELS[agent.status]}</span>
        </div>
      </div>
      <p style={{ color: "#6b7a9e", fontSize: "11.5px", lineHeight: "1.6", margin: "0 0 14px" }}>{agent.description}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "5px" }}>
          {agent.commands.slice(0, 2).map(cmd => <span key={cmd} style={{ background: `${agent.color}22`, color: agent.color, fontSize: "9px", padding: "2px 7px", borderRadius: "4px", fontFamily: "monospace" }}>{cmd}</span>)}
        </div>
        <div style={{ color: "#3a4060", fontSize: "10px", fontFamily: "monospace" }}>{agent.isCryptoAgent ? "🟢 live data" : `${agent.runsToday} runs today`}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = AGENTS.filter(a => {
    const matchV = filter === "All" || a.vertical === filter;
    const matchS = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.slug.toLowerCase().includes(search.toLowerCase());
    return matchV && matchS;
  });

  const stats = { deployed: AGENTS.filter(a => a.status === "deployed").length, running: AGENTS.filter(a => a.status === "running").length, idle: AGENTS.filter(a => a.status === "idle").length, totalRuns: AGENTS.reduce((s, a) => s + a.runsToday, 0) };

  return (
    <div style={{ minHeight: "100vh", background: "#070910", color: "#f0f2f8", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0b0d14; } ::-webkit-scrollbar-thumb { background: #2a2d3e; border-radius: 2px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes livePulse { 0%, 100% { opacity: 1; box-shadow: 0 0 6px #4ade80; } 50% { opacity: 0.4; box-shadow: none; } }
      `}</style>

      <div style={{ borderBottom: "1px solid #1a1d2e", padding: "16px 32px", display: "flex", alignItems: "center", gap: "16px", background: "#070910", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginRight: "auto" }}>
          <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #C8A97E, #F0B429)", borderRadius: "6px" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: "14px" }}>financial-services</span>
          <span style={{ color: "#2a3050", fontFamily: "monospace" }}>/</span>
          <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#4a5170" }}>agent-dashboard</span>
        </div>
        <a href="https://github.com/anthropics/financial-services" target="_blank" rel="noopener noreferrer" style={{ color: "#4a5170", fontSize: "11px", fontFamily: "monospace", textDecoration: "none", border: "1px solid #1e2130", padding: "5px 12px", borderRadius: "6px" }}>↗ GitHub</a>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 61px)" }}>
        <div style={{ width: selectedAgent ? "440px" : "100%", flexShrink: 0, overflow: "auto", padding: "24px 28px", borderRight: selectedAgent ? "1px solid #1a1d2e" : "none", transition: "width 0.25s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "24px" }}>
            {[{ label: "Active", value: stats.deployed, color: "#60a5fa" }, { label: "Running", value: stats.running, color: "#4ade80" }, { label: "Idle", value: stats.idle, color: "#6b7280" }, { label: "Runs Today", value: stats.totalRuns, color: "#F0B429" }].map(s => (
              <div key={s.label} style={{ background: "#0b0d14", border: "1px solid #1a1d2e", borderRadius: "10px", padding: "14px" }}>
                <div style={{ color: s.color, fontSize: "22px", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: "#3a4060", fontSize: "10px", fontFamily: "monospace", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..." style={{ flex: 1, background: "#0b0d14", border: "1px solid #1e2130", borderRadius: "8px", padding: "8px 14px", color: "#c0cce0", fontSize: "12px", fontFamily: "monospace", outline: "none" }} />
            <div style={{ display: "flex", gap: "4px" }}>
              {["All", "Research", "Finance", "Crypto"].map((v, i) => {
                const full = ["All", "Research & Coverage", "Finance & Operations", "Crypto & Digital Assets"][i];
                return <button key={v} onClick={() => setFilter(full)} style={{ background: filter === full ? "#1e2130" : "none", border: `1px solid ${filter === full ? "#2a2d3e" : "#1a1d2e"}`, color: filter === full ? "#f0f2f8" : "#4a5170", fontSize: "11px", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace" }}>{v}</button>;
              })}
            </div>
          </div>

          {["Research & Coverage", "Finance & Operations", "Crypto & Digital Assets", "Intelligence"].map(vertical => {
            const agents = filtered.filter(a => a.vertical === vertical);
            if (!agents.length) return null;
            const isCrypto = vertical === "Crypto & Digital Assets";
            const isIntel = vertical === "Intelligence";
            return (
              <div key={vertical} style={{ marginBottom: "28px" }}>
                <div style={{ color: isIntel ? "#E879F966" : isCrypto ? "#F0B42966" : "#3a4060", fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1, height: "1px", background: isIntel ? "#E879F922" : isCrypto ? "#F0B42922" : "#1a1d2e" }} />{vertical}<div style={{ flex: 1, height: "1px", background: isIntel ? "#E879F922" : isCrypto ? "#F0B42922" : "#1a1d2e" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: selectedAgent ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                  {agents.map(agent => <AgentCard key={agent.slug} agent={agent} onClick={setSelectedAgent} selected={selectedAgent?.slug === agent.slug} />)}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && <div style={{ color: "#2a3050", textAlign: "center", paddingTop: "60px", fontFamily: "monospace" }}>No agents match.</div>}
        </div>

        {selectedAgent && (
          <div style={{ flex: 1, overflow: "hidden", padding: "24px 28px", animation: "fadeIn 0.2s ease" }}>
            {selectedAgent.isCryptoAgent
              ? <CryptoDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
              : selectedAgent.isPredMktAgent
              ? <PredMktDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
              : selectedAgent.isIntelHub
              ? <IntelHubPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
              : <StandardDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
            }
          </div>
        )}
      </div>
    </div>
  );
}
