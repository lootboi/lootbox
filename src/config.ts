import dotenv from "dotenv";
import { SupportedExchanges } from "./types/exchange";
import { ExchangeConfig } from "./types";
dotenv.config();

/**
 * Order book ports
 */
export const hyperLiquidOrderBookPort =
  Number(process.env.HYPER_LIQUID_PORT) || 8080;

/**
 * Order book socket URLs.
 */
export const hyperLiquidOrderBookWss = "wss://api.hyperliquid.xyz/ws";

/**
 * Order book configs.
 */
export const ExchangeConfigs = new Map<SupportedExchanges, ExchangeConfig>([
  [
    SupportedExchanges.HYPER_LIQUID,
    {
      orderBookWss: hyperLiquidOrderBookWss,
    },
  ],
]);
