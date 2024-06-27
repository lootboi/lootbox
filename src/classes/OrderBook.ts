import WebSocket from "ws";

import { IOrderBook } from "../interfaces/orderBook";
import { OrderBookHandler } from "./OrderBookHandler";

import {
  OrderBookPayload,
  OrderBookRates,
  OrderBookStatus,
} from "../types/orderBookHandler";
import { Order, OrderSide } from "../types/orders";
import { Exchange } from "./Exchange";

export class OrderBook implements IOrderBook {
  public exchangeName: string;
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
  private static internalWebSockets: { [port: number]: WebSocket } = {};

  constructor(
    market: string,
    orderBookHandler: OrderBookHandler,
    silent: boolean = false
  ) {
    this.market = market;
    this.orderBookHandler = orderBookHandler;
    this.silent = silent;
    this.exchangeName = orderBookHandler.exchangeName;
    this.connectToInternalWebSocket();
  }

  private connectToInternalWebSocket(): void {
    const wss = `ws://localhost:${this.orderBookHandler.port}`;
    if (!OrderBook.internalWebSockets[this.orderBookHandler.port]) {
      const internalWebSocket = new WebSocket(wss);

      internalWebSocket.on("open", () => {
        this.log("Connected to internal WebSocket server.");
      });

      internalWebSocket.on("message", (data: WebSocket.Data) => {
        this.handleMessage(this.silent, data);
      });

      internalWebSocket.on("close", () => {
        this.log(
          "Disconnected from internal WebSocket server. Reconnecting..."
        );
        setTimeout(() => this.connectToInternalWebSocket(), 5000);
      });

      internalWebSocket.on("error", (error) => {
        this.log(`WebSocket error: ${error}`);
      });

      OrderBook.internalWebSockets[this.orderBookHandler.port] =
        internalWebSocket;
    }

    this.internalWebSocket =
      OrderBook.internalWebSockets[this.orderBookHandler.port];
  }

  private handleMessage(silent: boolean, data: WebSocket.Data): void {
    const payload: OrderBookPayload = JSON.parse(data.toString());

    this.lastUpdate = payload.localTs;
    this.bids = payload.bids;
    this.asks = payload.asks;

    this.updateBook();
  }

  public subscribe(subscription: object): void {
    // Implement subscription logic
  }

  public updateBook(): void {
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

    const handlerStatus = this.orderBookHandler.status[this.market];
    const handlerHistoricalData =
      this.orderBookHandler.historicalData[this.market];

    if (
      handlerStatus === OrderBookStatus.CONNECTED &&
      handlerHistoricalData.length >= this.orderBookHandler.sampleSize &&
      !this.initialized
    ) {
      this.initialized = true;
      this.log(
        `Order book initialized for ${this.exchangeName} ${this.market} market.`
      );
    } else if (this.orderBookHandler.sampleSize === 0) {
      this.initialized = true;
    }
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

  public updateMarketRates(rates: OrderBookRates): void {
    this.rates = rates;
  }

  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  public async fetchMarketRates(): Promise<OrderBookRates[]> {
    const rates = await this.orderBookHandler.fetchMarketRates();

    const marketRate = rates.find((rate) => rate.market === this.market);

    if (marketRate) this.updateMarketRates(marketRate);
    if (!marketRate) this.log(`No market rate found for ${this.market}`);

    return rates;
  }
}
