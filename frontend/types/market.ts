/**
 * Types for market data used throughout the application
 */

export type MarketIndex = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent?: number;
};

export type StockData = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number; // Added percentChange property
  volume?: number;
  marketCap?: number;
  pe?: number;
  dividend?: number;
};

export type MarketTrend = {
  sector: string;
  trend: "up" | "down" | "mixed";
  percentage: number;
  reason: string;
};

export type NewsItem = {
  title: string;
  source: string;
  url: string;
  timestamp: string;
  summary: string;
  image?: string;
  sentiment?: string;
  tickers?: string[];
};

export type PortfolioItem = {
  symbol: string;
  name: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
};
