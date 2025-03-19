export type MarketIndex = {
  name: string;
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
};

export type StockItem = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  volume?: number;
  marketCap?: number;
  analysis?: string;
};

export type StockData = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume?: number;
  marketCap?: number;
  pe?: number;
  dividend?: number;
};

export type PortfolioItem = {
  symbol: string;
  name: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
};

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  summary: string;
  url: string;
  publishedAt: string;
  imageUrl?: string;
};

export type MarketTrend = {
  sector: string;
  trend: "up" | "down" | "mixed";
  percentage: number;
  reason: string;
};

// Market indices data
export const marketIndices: MarketIndex[] = [
  {
    name: "S&P 500",
    symbol: "SPX",
    price: 5208.67,
    change: 32.64,
    percentChange: 0.63,
  },
  {
    name: "Dow Jones",
    symbol: "DJI",
    price: 39118.87,
    change: -14.18,
    percentChange: -0.04,
  },
  {
    name: "Nasdaq",
    symbol: "IXIC",
    price: 16398.62,
    change: 184.76,
    percentChange: 1.14,
  },
  {
    name: "Russell 2000",
    symbol: "RUT",
    price: 2068.52,
    change: 12.90,
    percentChange: 0.63,
  },
];

// Watchlist data
export const watchlistItems: StockItem[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 168.27,
    change: 0.45,
    percentChange: 0.27,
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    price: 417.88,
    change: 4.23,
    percentChange: 1.02,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 165.36,
    change: 1.67,
    percentChange: 1.02,
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 184.76,
    change: 1.83,
    percentChange: 1.00,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 879.90,
    change: 22.83,
    percentChange: 2.66,
  },
];

// Portfolio data
export const portfolioItems: PortfolioItem[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    shares: 10,
    averageCost: 150.25,
    currentPrice: 168.27,
    totalValue: 1682.70,
    gainLoss: 180.20,
    gainLossPercent: 12.00,
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    shares: 5,
    averageCost: 380.50,
    currentPrice: 417.88,
    totalValue: 2089.40,
    gainLoss: 186.90,
    gainLossPercent: 9.82,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    shares: 3,
    averageCost: 700.20,
    currentPrice: 879.90,
    totalValue: 2639.70,
    gainLoss: 539.10,
    gainLossPercent: 25.66,
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    shares: 8,
    averageCost: 170.30,
    currentPrice: 184.76,
    totalValue: 1478.08,
    gainLoss: 115.68,
    gainLossPercent: 8.49,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    shares: 12,
    averageCost: 140.75,
    currentPrice: 165.36,
    totalValue: 1984.32,
    gainLoss: 295.32,
    gainLossPercent: 17.48,
  },
];

// Market trends data
export const marketTrends: MarketTrend[] = [
  {
    sector: "Technology",
    trend: "up",
    percentage: 1.8,
    reason: "AI-related stocks continue to lead market gains following positive earnings reports and increased institutional investment in AI technologies."
  },
  {
    sector: "Consumer Discretionary",
    trend: "down",
    percentage: -1.2,
    reason: "Worries about consumer spending persist as inflation continues to impact household budgets and retail sales data disappointed analysts."
  },
  {
    sector: "Energy",
    trend: "mixed",
    percentage: 0.3,
    reason: "Oil prices stabilized after recent volatility, but ongoing geopolitical tensions create uncertainty for the sector's near-term outlook."
  },
  {
    sector: "Healthcare",
    trend: "up",
    percentage: 0.9,
    reason: "Pharmaceutical companies rallied after positive clinical trial results and increased Medicare coverage announcements for several key drugs."
  },
  {
    sector: "Financials",
    trend: "down",
    percentage: -0.7,
    reason: "Banks faced pressure as treasury yields declined and concerns about commercial real estate exposure weighed on the sector."
  }
];

// Market movers data
export const marketMovers: StockItem[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 879.90,
    change: 22.83,
    percentChange: 2.66,
    volume: 45879632,
    marketCap: 2168000000000,
    analysis: "Surging on new AI chip announcements and expanded data center partnerships with major cloud providers. Analysts raised price targets citing accelerating AI adoption and increased enterprise spending."
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices, Inc.",
    price: 158.79,
    change: 4.12,
    percentChange: 2.66,
    volume: 46521004,
    marketCap: 256400000000,
    analysis: "Gaining momentum after revealing new MI325X AI accelerators that outperform previous generation by 40%. Market share gains in data center segment contributing to positive sentiment."
  },
  {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    price: 177.58,
    change: 3.41,
    percentChange: 1.96,
    volume: 97459726,
    marketCap: 564800000000,
    analysis: "Rallying after Q2 delivery numbers exceeded lowered expectations. FSD v12 rollout timeline accelerated and Cybertruck production ramp showing improved efficiency."
  },
  {
    symbol: "PLTR",
    name: "Palantir Technologies Inc.",
    price: 22.67,
    change: 0.42,
    percentChange: 1.89,
    volume: 47659854,
    marketCap: 49500000000,
    analysis: "Rising on new government contracts and expanded commercial AI platform adoption. Bootcamp program showing accelerated enterprise conversion rates."
  },
  {
    symbol: "META",
    name: "Meta Platforms, Inc.",
    price: 499.32,
    change: 8.41,
    percentChange: 1.71,
    volume: 15423650,
    marketCap: 1278000000000,
    analysis: "Advancing after reporting strong ad revenue growth and lower-than-expected AI infrastructure costs. Ray-Ban Meta smart glasses sales exceeding internal projections."
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 168.27,
    change: 2.53,
    percentChange: 1.53,
    volume: 52361987,
    marketCap: 2597000000000,
    analysis: "Gaining as iPhone 16 production ramps with improved AI capabilities. Services revenue growing at double-digit rate with higher margins than hardware segment."
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    price: 417.88,
    change: 5.67,
    percentChange: 1.37,
    volume: 18725463,
    marketCap: 3105000000000,
    analysis: "Moving higher after Azure cloud growth reaccelerated and Copilot AI integrations drove Office 365 subscription increases. Enterprise AI adoption showing better-than-expected monetization."
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 184.76,
    change: 2.15,
    percentChange: 1.18,
    volume: 36789521,
    marketCap: 1918000000000,
    analysis: "Climbing on AWS growth stabilization and improved retail margins. Advertising business showing strong momentum as merchants increase platform spending."
  },
  {
    symbol: "INTC",
    name: "Intel Corporation",
    price: 30.93,
    change: -0.87,
    percentChange: -2.74,
    volume: 33654210,
    marketCap: 130800000000,
    analysis: "Declining after key customer server CPU orders were reportedly delayed. Foundry business facing increased competition and yield challenges at advanced nodes."
  },
  {
    symbol: "PFE",
    name: "Pfizer Inc.",
    price: 26.67,
    change: -0.56,
    percentChange: -2.06,
    volume: 36987452,
    marketCap: 151000000000,
    analysis: "Falling as COVID-related product sales continue to decline faster than anticipated. Pipeline concerns persist despite recent oncology drug approval."
  },
  {
    symbol: "DIS",
    name: "Walt Disney Co.",
    price: 101.25,
    change: -1.87,
    percentChange: -1.81,
    volume: 18632541,
    marketCap: 184900000000,
    analysis: "Dropping amid streaming subscriber growth concerns and lower-than-expected theme park attendance. Content costs remain elevated as competition intensifies."
  },
  {
    symbol: "KO",
    name: "Coca-Cola Co.",
    price: 62.35,
    change: -1.05,
    percentChange: -1.66,
    volume: 14587632,
    marketCap: 269500000000,
    analysis: "Retreating as elasticity in response to price increases shows signs of weakening. International market growth slowing in key emerging markets."
  },
];

// News data
export const newsItems: NewsItem[] = [
  {
    id: "1",
    title: "Fed's Powell says more good inflation readings needed before cutting rates",
    source: "Reuters",
    summary: "Federal Reserve Chair Jerome Powell said on Monday the U.S. central bank needs to see more evidence that inflation is cooling before cutting interest rates, noting that recent data had not given policymakers greater confidence price pressures were moving sustainably down to their 2% target.",
    url: "#",
    publishedAt: "2023-05-20T14:30:00Z",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1470&auto=format&fit=crop",
  },
  {
    id: "2",
    title: "NVIDIA stock surges as AI boom continues to fuel demand",
    source: "Bloomberg",
    summary: "NVIDIA shares rose to a record high on Monday as analysts continued to express optimism about the chipmaker's prospects in the booming artificial intelligence market. The company is set to report its Q1 earnings next week.",
    url: "#",
    publishedAt: "2023-05-20T12:15:00Z",
    imageUrl: "https://images.unsplash.com/photo-1639762681057-408e52192e55?q=80&w=1632&auto=format&fit=crop",
  },
  {
    id: "3",
    title: "Apple's new AI strategy to be unveiled at WWDC in June",
    source: "The Wall Street Journal",
    summary: "Apple is expected to announce significant AI features for its devices at its annual Worldwide Developers Conference next month, potentially including integration with OpenAI's ChatGPT and various on-device AI functionalities.",
    url: "#",
    publishedAt: "2023-05-19T22:45:00Z",
    imageUrl: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1470&auto=format&fit=crop",
  },
  {
    id: "4",
    title: "Oil prices drop as Middle East tensions ease slightly",
    source: "Financial Times",
    summary: "Oil prices fell on Monday as fears of immediate escalation in the Middle East conflict eased slightly, with traders now focusing on the upcoming OPEC+ meeting and global demand outlook.",
    url: "#",
    publishedAt: "2023-05-19T18:20:00Z",
  },
];

// Investment summary
export const investmentSummary = {
  totalValue: 9874.20,
  dailyChange: 167.38,
  dailyChangePercent: 1.72,
  totalGainLoss: 1317.20,
  totalGainLossPercent: 15.39,
};
