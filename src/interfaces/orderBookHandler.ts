import { SupportedExchanges } from "../types/exchange";
import {
  OrderBookPayload,
  OrderBookRates,
  OrderBookStatus,
} from "../types/orderBookHandler";

export interface IOrderBookHandler {
  exchange: SupportedExchanges;
  port: number;
  status: { [symbol: string]: OrderBookStatus };
  historicalData: { [symbol: string]: OrderBookPayload[] };
  sampleSize: number;

  subscribe(market: string): void;
  fetchMarketRates(): Promise<OrderBookRates[]>;
}
