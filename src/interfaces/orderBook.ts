import WebSocket from "ws";

import { Order, OrderSide } from "../types/orders";
import { OrderBookRates } from "../types/orderBookHandler";

export interface IOrderBook {
  initialized: boolean;

  market: string;
  bids: Order[];
  asks: Order[];
  rates: OrderBookRates;
  lastUpdate: number;

  bestBid: number;
  bestAsk: number;
  totalBidSize: number;
  totalAskSize: number;

  midPrice: number;
  weightedMidPrice: number;

  spread: number;
  bidSpread: number;
  askSpread: number;

  internalWebSocket: WebSocket;

  /**
   * Websocket related methods
   */
  subscribe(subscription: object): void;
  updateBook(silent: boolean): void;

  /**
   * API related methods
   */

  /**
   * Math related methods
   */
  calculateMidPrice(): number;
  calculateSpread(): number;
  calculateBidSpread(): number;
  calculateAskSpread(): number;
  calculateWeightedMidPrice(): number;
  getSlippage(side: OrderSide, size: number): number;
  fetchMarketRates(): Promise<OrderBookRates[]>;
}
