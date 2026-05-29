// ~25 liquid mega-caps spanning sectors. Edit freely — this is the universe the
// homepage "movers" section quotes and sorts (Finnhub free tier has no
// market-wide movers endpoint, so we curate a basket of popular names).
// Names are hardcoded so we don't pay a profile lookup per ticker.
export const MOVERS_UNIVERSE: { ticker: string; name: string }[] = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "META", name: "Meta Platforms" },
  { ticker: "TSLA", name: "Tesla" },
  { ticker: "AVGO", name: "Broadcom" },
  { ticker: "JPM", name: "JPMorgan Chase" },
  { ticker: "V", name: "Visa" },
  { ticker: "WMT", name: "Walmart" },
  { ticker: "XOM", name: "Exxon Mobil" },
  { ticker: "UNH", name: "UnitedHealth" },
  { ticker: "MA", name: "Mastercard" },
  { ticker: "JNJ", name: "Johnson & Johnson" },
  { ticker: "HD", name: "Home Depot" },
  { ticker: "PG", name: "Procter & Gamble" },
  { ticker: "COST", name: "Costco" },
  { ticker: "ORCL", name: "Oracle" },
  { ticker: "BAC", name: "Bank of America" },
  { ticker: "NFLX", name: "Netflix" },
  { ticker: "AMD", name: "Advanced Micro Devices" },
  { ticker: "CRM", name: "Salesforce" },
  { ticker: "KO", name: "Coca-Cola" },
  { ticker: "DIS", name: "Disney" },
];

// Sector ETFs whose company-news feeds we surface as "sector headlines".
export const SECTOR_NEWS_ETFS: { etf: string; label: string }[] = [
  { etf: "XLK", label: "Technology" },
  { etf: "XLF", label: "Financials" },
  { etf: "XLV", label: "Health Care" },
  { etf: "XLE", label: "Energy" },
];

// The 11 SPDR sector ETFs — powers the homepage performance heatmap.
export const SECTOR_ETFS: { etf: string; label: string }[] = [
  { etf: "XLK", label: "Technology" },
  { etf: "XLC", label: "Communication" },
  { etf: "XLF", label: "Financials" },
  { etf: "XLV", label: "Health Care" },
  { etf: "XLY", label: "Consumer Disc." },
  { etf: "XLP", label: "Consumer Staples" },
  { etf: "XLE", label: "Energy" },
  { etf: "XLI", label: "Industrials" },
  { etf: "XLB", label: "Materials" },
  { etf: "XLU", label: "Utilities" },
  { etf: "XLRE", label: "Real Estate" },
];
