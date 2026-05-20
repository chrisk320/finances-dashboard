export type CryptoCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  sparkline_in_7d: { price: number[] };
};

export type CryptoMover = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  usd: number;
  usd_24h_change: number;
};

export type GlobalMarket = {
  total_market_cap_usd: number;
  volume_24h_usd: number;
  market_cap_change_24h: number;
  btc_dominance: number;
  eth_dominance: number;
  active_cryptos: number;
};

export const LIVE_DATA: {
  global: GlobalMarket;
  topCoins: CryptoCoin[];
  gainers: CryptoMover[];
  losers: CryptoMover[];
} = {
  global: {
    total_market_cap_usd: 2772231396322.95,
    volume_24h_usd: 90811009474.63,
    market_cap_change_24h: -1.162,
    btc_dominance: 58.31,
    eth_dominance: 9.95,
    active_cryptos: 17409,
  },
  topCoins: [
    { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400", current_price: 80691, price_change_percentage_1h_in_currency: 0.057, price_change_percentage_24h: -1.027, price_change_percentage_7d_in_currency: -0.29, sparkline_in_7d: { price: [81025, 81397, 81358, 81584, 81306, 81473, 81899, 81952, 82290, 82496, 82205, 81706, 81680, 81360, 81467, 81396, 80518, 80160, 79895, 79785, 80080, 79864, 79778, 79901, 79726, 79643, 80047, 79588, 80097, 80026, 80225, 80393, 80350, 80513, 80630, 80785, 80879, 80788, 80742, 80636, 80740, 80784, 80687, 80807, 80866, 80887, 81405, 81443, 81179, 80825, 80841, 80740, 80942, 81149, 81572, 81900, 81795, 81530, 81026, 81010, 80837, 80632, 80745, 80485, 80679, 80675, 80480] } },
    { id: "ethereum", symbol: "eth", name: "Ethereum", image: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628", current_price: 2284.35, price_change_percentage_1h_in_currency: 0.084, price_change_percentage_24h: -2.136, price_change_percentage_7d_in_currency: -3.25, sparkline_in_7d: { price: [2364, 2371, 2376, 2391, 2410, 2411, 2404, 2358, 2349, 2350, 2331, 2322, 2329, 2343, 2334, 2326, 2314, 2298, 2290, 2299, 2288, 2284, 2278, 2281, 2280, 2287, 2295, 2275, 2291, 2316, 2312, 2316, 2320, 2329, 2331, 2330, 2326, 2322, 2326, 2328, 2327, 2329, 2325, 2332, 2336, 2339, 2341, 2333, 2315, 2310, 2310, 2303, 2286, 2263, 2275, 2284, 2274] } },
    { id: "tether", symbol: "usdt", name: "Tether", image: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png?1696501661", current_price: 0.9997, price_change_percentage_1h_in_currency: -0.001, price_change_percentage_24h: 0.007, price_change_percentage_7d_in_currency: -0.01, sparkline_in_7d: { price: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9999, 0.9999, 0.9999, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9998, 0.9997, 0.9997, 0.9997, 0.9997, 0.9997, 0.9997, 0.9997] } },
    { id: "binancecoin", symbol: "bnb", name: "BNB", image: "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970", current_price: 667.49, price_change_percentage_1h_in_currency: 0.286, price_change_percentage_24h: -0.043, price_change_percentage_7d_in_currency: 5.84, sparkline_in_7d: { price: [630, 634, 635, 638, 645, 651, 657, 647, 648, 649, 648, 647, 641, 650, 648, 647, 647, 643, 642, 641, 643, 635, 637, 638, 639, 636, 639, 638, 641, 643, 646, 647, 649, 651, 651, 655, 654, 653, 651, 650, 649, 648, 648, 647, 648, 650, 650, 651, 649, 652, 662, 660, 651, 665, 657, 655, 651, 652, 661, 662, 660, 656, 660, 662, 664, 666, 664] } },
    { id: "ripple", symbol: "xrp", name: "XRP", image: "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442", current_price: 1.44, price_change_percentage_1h_in_currency: 0.006, price_change_percentage_24h: -2.617, price_change_percentage_7d_in_currency: 1.75, sparkline_in_7d: { price: [1.41, 1.42, 1.42, 1.43, 1.44, 1.45, 1.45, 1.42, 1.43, 1.42, 1.42, 1.41, 1.41, 1.42, 1.42, 1.4, 1.39, 1.39, 1.39, 1.38, 1.39, 1.39, 1.39, 1.41, 1.42, 1.42, 1.42, 1.43, 1.43, 1.43, 1.42, 1.42, 1.42, 1.42, 1.43, 1.44, 1.47, 1.5, 1.49, 1.46, 1.47, 1.45, 1.46, 1.46, 1.46, 1.47, 1.49, 1.47, 1.47, 1.47, 1.48, 1.48, 1.47, 1.43, 1.43, 1.42, 1.43, 1.44, 1.44, 1.44, 1.44] } },
    { id: "solana", symbol: "sol", name: "Solana", image: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756", current_price: 94.44, price_change_percentage_1h_in_currency: -0.185, price_change_percentage_24h: -2.9, price_change_percentage_7d_in_currency: 9.4, sparkline_in_7d: { price: [86, 87, 87, 88, 89, 89, 89, 88, 89, 89, 88, 88, 90, 89, 89, 89, 88, 88, 89, 91, 92, 92, 92, 93, 93, 93, 93, 93, 92, 93, 93, 93, 94, 94, 94, 93, 93, 94, 94, 96, 96, 96, 95, 96, 95, 94, 95, 95, 95, 96, 97, 97, 97, 98, 97, 97, 97, 96, 96, 96, 96, 95, 95, 94, 94, 94, 94] } },
    { id: "tron", symbol: "trx", name: "TRON", image: "https://coin-images.coingecko.com/coins/images/1094/large/photo_2026-04-13_09-59-16.png?1776048311", current_price: 0.3488, price_change_percentage_1h_in_currency: -0.161, price_change_percentage_24h: -0.446, price_change_percentage_7d_in_currency: 1.27, sparkline_in_7d: { price: [0.345, 0.343, 0.343, 0.344, 0.343, 0.343, 0.343, 0.344, 0.346, 0.346, 0.346, 0.345, 0.344, 0.345, 0.346, 0.348, 0.349, 0.349, 0.349, 0.348, 0.347, 0.348, 0.349, 0.351, 0.35, 0.349, 0.348, 0.349, 0.349, 0.35, 0.351, 0.352, 0.351, 0.351, 0.352, 0.351, 0.35, 0.35, 0.35, 0.35, 0.35, 0.349, 0.349, 0.349, 0.349, 0.349, 0.349, 0.349, 0.348, 0.348, 0.349, 0.349, 0.349, 0.349, 0.349] } },
    { id: "dogecoin", symbol: "doge", name: "Dogecoin", image: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409", current_price: 0.11029, price_change_percentage_1h_in_currency: 0.099, price_change_percentage_24h: -0.944, price_change_percentage_7d_in_currency: -3.89, sparkline_in_7d: { price: [0.114, 0.115, 0.116, 0.117, 0.116, 0.116, 0.113, 0.113, 0.113, 0.112, 0.111, 0.11, 0.111, 0.112, 0.111, 0.111, 0.109, 0.108, 0.108, 0.108, 0.108, 0.107, 0.106, 0.107, 0.107, 0.108, 0.109, 0.109, 0.11, 0.109, 0.11, 0.111, 0.11, 0.11, 0.109, 0.108, 0.108, 0.108, 0.108, 0.111, 0.111, 0.108, 0.111, 0.113, 0.11, 0.11, 0.11, 0.11, 0.111, 0.111, 0.11, 0.111, 0.111, 0.11, 0.109, 0.109, 0.109] } },
    { id: "usd-coin", symbol: "usdc", name: "USDC", image: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png?1769615602", current_price: 0.9999, price_change_percentage_1h_in_currency: 0.006, price_change_percentage_24h: 0.006, price_change_percentage_7d_in_currency: 0.01, sparkline_in_7d: { price: [1, 1, 1, 1, 1, 1, 1, 0.9995, 0.9996, 0.9996, 0.9997, 0.9998, 0.9999, 0.9999, 0.9999, 0.9998, 0.9998, 0.9998, 0.9999, 0.9998, 0.9999, 0.9998, 0.9999, 0.9998, 0.9999, 0.9998, 0.9997, 0.9998, 0.9998, 0.9997, 0.9997, 0.9997, 0.9997, 0.9998, 0.9997, 0.9998, 0.9998, 0.9998, 0.9998] } },
    { id: "figure-heloc", symbol: "figr", name: "Figure Heloc", image: "https://coin-images.coingecko.com/coins/images/68480/large/figure.png?1755863954", current_price: 1.037, price_change_percentage_1h_in_currency: 0, price_change_percentage_24h: 0.733, price_change_percentage_7d_in_currency: 0.37, sparkline_in_7d: { price: [1.033, 1.033, 1.033, 1.033, 1.033, 1.033, 1.015, 1.022, 1.02, 1.02, 1.01, 1.018, 1.014, 1.006, 1.003, 1.003, 1.003, 1.003, 1.001, 1.028, 1.028, 1.028, 1.028, 1.028, 1, 1, 1, 1.006, 1.014, 1.039, 1.032, 1.03, 1.03, 1.03, 1.03, 1.031, 1.031, 1.037, 1.037] } },
  ],
  gainers: [
    { id: "billions-network", symbol: "bill", name: "Billions Network", image: "https://coin-images.coingecko.com/coins/images/68464/original/billions.png?1755828007", usd: 0.18982, usd_24h_change: 35.28 },
    { id: "unibase", symbol: "ub", name: "Unibase", image: "https://coin-images.coingecko.com/coins/images/69108/original/unibase.png?1757501820", usd: 0.1693, usd_24h_change: 25.78 },
    { id: "telcoin", symbol: "tel", name: "Telcoin", image: "https://coin-images.coingecko.com/coins/images/1899/original/tel.png?1696502892", usd: 0.00289, usd_24h_change: 22.65 },
    { id: "skyai", symbol: "SKYAI", name: "SkyAI", image: "https://coin-images.coingecko.com/coins/images/55294/original/1.png?1745517593", usd: 0.54331, usd_24h_change: 20.18 },
    { id: "stable-2", symbol: "stable", name: "Stable", image: "https://coin-images.coingecko.com/coins/images/69242/original/stable-logotype-framed-square-light.png?1762753913", usd: 0.04068, usd_24h_change: 18.29 },
    { id: "kite-2", symbol: "kite", name: "Kite", image: "https://coin-images.coingecko.com/coins/images/70426/original/KITE-ICON.png?1762328605", usd: 0.20379, usd_24h_change: 16.04 },
    { id: "injective-protocol", symbol: "inj", name: "Injective", image: "https://coin-images.coingecko.com/coins/images/12882/original/Other_200x200.png?1738782212", usd: 4.83044, usd_24h_change: 6.23 },
    { id: "near", symbol: "near", name: "NEAR Protocol", image: "https://coin-images.coingecko.com/coins/images/10365/original/near.jpg?1696510367", usd: 1.62069, usd_24h_change: 5.41 },
    { id: "akash-network", symbol: "akt", name: "Akash Network", image: "https://coin-images.coingecko.com/coins/images/12785/original/akash-logo.png?1696512580", usd: 0.89604, usd_24h_change: 7.02 },
    { id: "zcash", symbol: "zec", name: "Zcash", image: "https://coin-images.coingecko.com/coins/images/486/original/circle-zcash-color.png?1696501740", usd: 581.69, usd_24h_change: 3.85 },
  ],
  losers: [
    { id: "terra-luna", symbol: "lunc", name: "Terra Luna Classic", image: "https://coin-images.coingecko.com/coins/images/8284/original/01_LunaClassic_color.png?1696508486", usd: 0.0000908, usd_24h_change: -10.77 },
    { id: "humanity", symbol: "h", name: "Humanity", image: "https://coin-images.coingecko.com/coins/images/66811/original/H_tokenLogo_original.png?1750581252", usd: 0.24124, usd_24h_change: -10.05 },
    { id: "fartcoin", symbol: "fartcoin", name: "Fartcoin", image: "https://coin-images.coingecko.com/coins/images/50891/original/fart.jpg?1729503972", usd: 0.23301, usd_24h_change: -9.38 },
    { id: "ondo-finance", symbol: "ondo", name: "Ondo", image: "https://coin-images.coingecko.com/coins/images/26580/original/ONDO.png?1696525656", usd: 0.39041, usd_24h_change: -9.16 },
    { id: "monad", symbol: "MON", name: "Monad", image: "https://coin-images.coingecko.com/coins/images/38927/original/mon.png?1766029057", usd: 0.030871, usd_24h_change: -8.07 },
    { id: "sei-network", symbol: "sei", name: "Sei", image: "https://coin-images.coingecko.com/coins/images/28205/original/Sei_Logo_-_Transparent.png?1696527207", usd: 0.06969, usd_24h_change: -7.74 },
    { id: "the-open-network", symbol: "ton", name: "Toncoin", image: "https://coin-images.coingecko.com/coins/images/17980/original/photo_2024-09-10_17.09.00.jpeg?1725963446", usd: 2.3101, usd_24h_change: -5.84 },
    { id: "virtual-protocol", symbol: "virtual", name: "Virtuals Protocol", image: "https://coin-images.coingecko.com/coins/images/34057/original/LOGOMARK.png?1708356054", usd: 0.81684, usd_24h_change: -4.86 },
    { id: "internet-computer", symbol: "icp", name: "Internet Computer", image: "https://coin-images.coingecko.com/coins/images/14495/original/Internet_Computer_logo.png?1696514180", usd: 3.17247, usd_24h_change: -4.61 },
    { id: "jupiter-exchange-solana", symbol: "JUP", name: "Jupiter", image: "https://coin-images.coingecko.com/coins/images/34188/original/jup.png?1704266489", usd: 0.23566, usd_24h_change: -5.73 },
  ],
};

export function findCoinBySymbol(symbol: string): CryptoCoin | undefined {
  const s = symbol.toLowerCase();
  return LIVE_DATA.topCoins.find((c) => c.symbol === s || c.id === s);
}
