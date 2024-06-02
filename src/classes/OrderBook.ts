import WebSocket from "ws";

import { OrderBookHandler } from "./OrderBookHandler";
import { Order, OrderSide } from "../types/orders";
import {
  OrderBookPayload,
  OrderBookRates,
  OrderBookStatus,
} from "../types/orderBookHandler";
import { IOrderBook } from "../interfaces/orderBook";
import { Exchange } from "../types/exchange";

export class OrderBook implements IOrderBook {
  public exchange: Exchange;
  public silent: boolean;
  public initialized: boolean = false;

  public orderBookHandler: OrderBookHandler;

  public lastUpdate: number = 0;
  public market: string;
  public bids: Order[] = [];
  public asks: Order[] = [];
  public rates: OrderBookRates;

  public bestBid: number = 0;
  public bestAsk: number = 0;
  public totalBidSize: number = 0;
  public totalAskSize: number = 0;

  public midPrice: number = 0;
  public weightedMidPrice: number = 0;

  public spread: number = 0;
  public bidSpread: number = 0;
  public askSpread: number = 0;

  public internalWebSocket: WebSocket;

  constructor(
    market: string,
    orderBookHandler: OrderBookHandler,
    silent: boolean = false
  ) {
    this.market = market;
    this.orderBookHandler = orderBookHandler;
    this.connectToInternalWebSocket();
    this.silent = silent;
    this.exchange = orderBookHandler.exchange;
  }

  private connectToInternalWebSocket(silent: boolean = false): void {
    const wss = `ws://localhost:${this.orderBookHandler.port}`;
    this.internalWebSocket = new WebSocket(wss);

    this.internalWebSocket.on("open", () => {
      this.log("Connected to internal WebSocket server.");
    });

    this.internalWebSocket.on("message", (data: WebSocket.Data) => {
      this.handleMessage(silent, data);
    });

    this.internalWebSocket.on("close", () => {
      this.log("Disconnected from internal WebSocket server. Reconnecting...");
      setTimeout(() => this.connectToInternalWebSocket(), 5000);
    });

    this.internalWebSocket.on("error", (error) => {
      this.log(`WebSocket error: ${error}`);
    });
  }

  private handleMessage(silent: boolean = false, data: WebSocket.Data): void {
    const payload: OrderBookPayload = JSON.parse(data.toString());

    this.lastUpdate = payload.localTs;
    this.bids = payload.bids;
    this.asks = payload.asks;

    this.updateBook(silent);
  }

  public subscribe(subscription: object): void {
    // Implement subscription logic
  }

  public updateBook(silent: boolean): void {
    if (this.bids.length > 0) {
      this.bestBid = parseFloat(this.bids[0].px);
      this.totalBidSize = this.bids.reduce(
        (acc, bid) => acc + parseFloat(bid.sz),
        0
      );
    } else {
      this.bestBid = 0;
      this.totalBidSize = 0;
    }

    if (this.asks.length > 0) {
      this.bestAsk = parseFloat(this.asks[0].px);
      this.totalAskSize = this.asks.reduce(
        (acc, ask) => acc + parseFloat(ask.sz),
        0
      );
    } else {
      this.bestAsk = 0;
      this.totalAskSize = 0;
    }

    this.midPrice = this.calculateMidPrice();
    this.weightedMidPrice = this.calculateWeightedMidPrice();

    this.spread = this.calculateSpread();
    this.bidSpread = this.calculateBidSpread();
    this.askSpread = this.calculateAskSpread();

    if (
      this.orderBookHandler.status === OrderBookStatus.CONNECTED &&
      this.orderBookHandler.historicalData.length >=
        this.orderBookHandler.sampleSize &&
      !this.initialized
    ) {
      this.initialized = true;
      this.log(
        `Order book initialized for ${this.exchange} ${this.market} market.`
      );
    } else if (this.orderBookHandler.sampleSize === 0) {
      this.initialized = true;
    }

    if (
      !silent &&
      this.orderBookHandler.status === OrderBookStatus.CONNECTED &&
      this.initialized
    ) {
      this.log(
        JSON.stringify({
          bestBid: this.bestBid,
          bestAsk: this.bestAsk,
          totalBidSize: this.totalBidSize,
          totalAskSize: this.totalAskSize,
          midPrice: this.midPrice,
          spread: this.spread,
          bidSpread: this.bidSpread,
          askSpread: this.askSpread,
          weightedMidPrice: this.weightedMidPrice,
        })
      );
    }
  }

  public fetchMarketRates(): void {
    this.orderBookHandler.fetchMarketRates();
  }

  public calculateMidPrice(): number {
    return (this.bestBid + this.bestAsk) / 2;
  }

  public calculateSpread(): number {
    return this.bestAsk - this.bestBid;
  }

  public calculateBidSpread(): number {
    if (this.bids.length === 0) return 0;
    const bidPrices = this.bids.map((bid) => parseFloat(bid.px));
    const maxBid = Math.max(...bidPrices);
    const minBid = Math.min(...bidPrices);
    return maxBid - minBid;
  }

  public calculateAskSpread(): number {
    if (this.asks.length === 0) return 0;
    const askPrices = this.asks.map((ask) => parseFloat(ask.px));
    const maxAsk = Math.max(...askPrices);
    const minAsk = Math.min(...askPrices);
    return maxAsk - minAsk;
  }

  public calculateWeightedMidPrice(): number {
    const totalSize = this.totalBidSize + this.totalAskSize;
    return totalSize === 0
      ? 0
      : (this.bestBid * this.totalAskSize + this.bestAsk * this.totalBidSize) /
          totalSize;
  }

  public getSlippage(side: OrderSide, size: number): number {
    const book = side === OrderSide.BID ? this.bids : this.asks;
    const mid = this.calculateMidPrice();
    let cumSize = 0.0;
    let slippage = 0.0;

    for (const order of book) {
      const price = parseFloat(order.px);
      const volume = parseFloat(order.sz);

      cumSize += volume;
      slippage += Math.abs(mid - price) * volume;

      if (cumSize >= size) {
        slippage /= cumSize;
        break;
      }
    }

    return slippage <= mid ? slippage : mid;
  }

  public async getMarketRates(): Promise<OrderBookRates> {
    this.rates = await this.orderBookHandler.fetchMarketRates();
    return this.rates;
  }

  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
}
