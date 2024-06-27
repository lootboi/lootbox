import { SupportedExchanges } from "./exchange";
import { Order } from "./orders";

export enum ExchangeRequestStatus {
  SUCCESS,
  ERROR,
}

export enum OrderBookStatus {
  INITIALIZING,
  WARMING_UP,
  CONNECTED,
  RESYNCING,
  ERROR,
}

export type OrderBookPayload = {
  ex: SupportedExchanges;
  symbol: string;
  status: OrderBookStatus;
  ts: number;
  localTs: number;
  bids: Order[];
  asks: Order[];
};

export type OrderBookRates = {
  status: ExchangeRequestStatus;
  market: string;
  fundingRate: number;
  spot: number;
  openInterest: number;
  premium: number;
};
