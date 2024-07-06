import { HyperLiquidMarkets } from "../../types/exchange/hyperliquid";

export const HYPER_LIQUID_URL = "https://api.hyperliquid.xyz/exchange";

export const HyperLiquidPairs: HyperLiquidMarkets = {
  BTC: { maxLeverage: 50, name: "BTC", szDecimals: 5 },
  ETH: { maxLeverage: 50, name: "ETH", szDecimals: 4 },
  ATOM: { maxLeverage: 50, name: "ATOM", szDecimals: 2 },
  MATIC: { maxLeverage: 50, name: "MATIC", szDecimals: 1 },
  DYDX: { maxLeverage: 50, name: "DYDX", szDecimals: 1 },
  SOL: { maxLeverage: 50, name: "SOL", szDecimals: 2 },
  AVAX: { maxLeverage: 50, name: "AVAX", szDecimals: 2 },
  BNB: { maxLeverage: 50, name: "BNB", szDecimals: 3 },
  APE: { maxLeverage: 50, name: "APE", szDecimals: 1 },
  OP: { maxLeverage: 50, name: "OP", szDecimals: 1 },
  LTC: { maxLeverage: 50, name: "LTC", szDecimals: 2 },
  ARB: { maxLeverage: 50, name: "ARB", szDecimals: 1 },
  DOGE: { maxLeverage: 50, name: "DOGE", szDecimals: 0 },
  INJ: { maxLeverage: 50, name: "INJ", szDecimals: 1 },
  SUI: { maxLeverage: 50, name: "SUI", szDecimals: 1 },
  kPEPE: { maxLeverage: 50, name: "kPEPE", szDecimals: 0 },
  CRV: { maxLeverage: 50, name: "CRV", szDecimals: 1 },
  LDO: { maxLeverage: 50, name: "LDO", szDecimals: 1 },
  LINK: { maxLeverage: 50, name: "LINK", szDecimals: 1 },
  STX: { maxLeverage: 50, name: "STX", szDecimals: 1 },
  RNDR: { maxLeverage: 50, name: "RNDR", szDecimals: 1 },
  CFX: { maxLeverage: 50, name: "CFX", szDecimals: 0 },
  FTM: { maxLeverage: 50, name: "FTM", szDecimals: 0 },
  GMX: { maxLeverage: 50, name: "GMX", szDecimals: 2 },
  SNX: { maxLeverage: 50, name: "SNX", szDecimals: 1 },
  XRP: { maxLeverage: 50, name: "XRP", szDecimals: 0 },
  BCH: { maxLeverage: 50, name: "BCH", szDecimals: 3 },
  APT: { maxLeverage: 50, name: "APT", szDecimals: 2 },
};
