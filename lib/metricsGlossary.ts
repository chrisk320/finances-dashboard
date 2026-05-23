export type MetricInfo = {
  label: string;
  definition: string;
  benchmark?: string;
};

export const METRIC_GLOSSARY: Record<string, MetricInfo> = {
  // ---------- Stock valuation ----------
  peTTM: {
    label: "P/E TTM",
    definition:
      "Price ÷ trailing-12-month earnings per share. How many dollars you pay for $1 of yearly earnings.",
    benchmark: "<18 cheap · 18–30 fair · >30 premium for a quality long-term holding.",
  },
  evEbitdaTTM: {
    label: "EV/EBITDA",
    definition:
      "Enterprise value (market cap + debt − cash) ÷ EBITDA. Like P/E but accounts for debt and ignores depreciation.",
    benchmark: "<12 cheap · 12–20 fair · >20 expensive.",
  },
  psTTM: {
    label: "P/S TTM",
    definition:
      "Price ÷ trailing-12-month sales per share. Useful when earnings are erratic (growth companies, recoveries).",
    benchmark: "<3 cheap · 3–8 fair · >8 expensive.",
  },
  fcfMarginTTM: {
    label: "FCF Margin",
    definition:
      "Free cash flow ÷ revenue. How many cents of real cash each $1 of sales produces after capex.",
    benchmark: ">15% strong · 5–15% acceptable · <5% weak cash quality.",
  },
  roeTTM: {
    label: "ROE TTM",
    definition:
      "Net income ÷ shareholder equity. How much profit the company generates per dollar of equity invested.",
    benchmark: ">15% high-quality · 5–15% acceptable · <5% poor return on capital.",
  },
  debtEquityAnnual: {
    label: "Debt / Equity",
    definition:
      "Total debt ÷ shareholder equity. How much the balance sheet leans on debt vs equity.",
    benchmark: "<0.5 conservative · 0.5–1.5 typical · >1.5 levered.",
  },
  dividendYieldTTM: {
    label: "Dividend Yield",
    definition:
      "Annual dividends per share ÷ stock price. The cash return on today's price from dividends alone.",
    benchmark:
      "Higher = more income now, but very high yields can signal slow growth or distress.",
  },
  week52Range: {
    label: "52W Range",
    definition: "The lowest and highest closing prices over the past 52 weeks.",
    benchmark:
      "Where today's price sits in this range hints at recent sentiment — near low ≈ out of favor, near high ≈ momentum.",
  },

  // ---------- Crypto ----------
  marketCap: {
    label: "Market Cap",
    definition:
      "Circulating-supply tokens × current price. The on-market value of all tokens trading today.",
    benchmark:
      "Higher generally means more liquidity, less volatility, and a more established asset.",
  },
  fullyDilutedValuation: {
    label: "FDV",
    definition:
      "Max-supply tokens × current price. What the market cap would be if every future token were already issued.",
    benchmark: "A big gap above market cap signals significant future dilution.",
  },
  fdvOverMc: {
    label: "FDV / MC",
    definition:
      "Fully diluted valuation ÷ current market cap. How much of the supply is still locked or unissued.",
    benchmark:
      "≤1.2× minimal dilution · 1.2–2× moderate · >2× heavy future supply overhang.",
  },
  volumeOverMc: {
    label: "Vol / MC",
    definition:
      "24-hour trading volume ÷ market cap. Turnover — how actively the token trades relative to its size.",
    benchmark: ">10% very active · 3–10% normal · <3% illiquid.",
  },
};

export function getMetricInfo(key: string): MetricInfo | undefined {
  return METRIC_GLOSSARY[key];
}
