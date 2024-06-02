import WebSocket from "ws";
import axios from "axios";

import { OrderBookHandler } from "../classes/OrderBookHandler";
import { RateLimiter } from "../classes/RateLimiter";

import { HyperLiquidWsBook } from "../types/hyperLiquid";
import {
  ExchangeRequestStatus,
  OrderBookRates,
  OrderBookStatus,
} from "../types/orderBookHandler";
import { Exchange } from "../types/exchange";

import { ExchangeConfigs } from "../config";

export class HyperLiquidOrderBookHandler extends OrderBookHandler {
  private updateIds: { [symbol: string]: number } = {};
  private symbol: string;

  constructor(port: number, symbol: string, sampleSize: number = 0) {
    super(
      Exchange.HYPER_LIQUID,
      symbol,
      sampleSize,
      port,
      ExchangeConfigs.get(Exchange.HYPER_LIQUID)?.orderBookWss as string,
      ["coin", "levels", "time"]
    );
    this.symbol = symbol;
    this.rateLimiter = new RateLimiter(Exchange.HYPER_LIQUID, 1200, 1200 / 60);
  }

  protected handleMessage(data: WebSocket.Data): void {
    const recv: HyperLiquidWsBook = JSON.parse(data.toString());
    if (this.validatePayload(recv)) {
      const symbol = this.symbol;
      const updateId = recv.data.time;
      if (symbol in this.updateIds) {
        if (updateId <= this.updateIds[symbol]) {
          this.log(`Duplicate or old update for ${symbol}, ignoring.`);
          return; // Duplicate or old update, ignore
        }
        this.updateIds[symbol] = updateId;
        this.process(recv);
      } else {
        this.updateIds[symbol] = updateId;
        this.resync(recv);
      }
    } else {
      // @ts-ignore
      this.send(OrderBookStatus.ERROR, this.symbol); // ERROR status
    }
  }

  protected resync(recv: HyperLiquidWsBook): void {
    try {
      const symbol = recv.data.coin;
      this.payload.ts = recv.data.time;
      this.payload.localTs = Date.now();
      this.payload.bids = recv.data.levels[0];
      this.payload.asks = recv.data.levels[1];
      this.send(OrderBookStatus.RESYNCING, symbol); // RESYNC status
    } catch (error) {
      this.log(`Resync error: ${error.message}`);
      this.send(OrderBookStatus.ERROR, recv.data.coin); // ERROR status
    }
  }

  protected process(recv: HyperLiquidWsBook): void {
    try {
      const symbol = recv.data.coin;
      this.payload.ts = recv.data.time;
      this.payload.localTs = Date.now() / 1000;
      this.payload.bids = recv.data.levels[0];
      this.payload.asks = recv.data.levels[1];

      if (this.sampleSize === 0) {
        this.send(OrderBookStatus.CONNECTED, symbol); // NORMAL status
      } else {
        if (this.historicalData.length < this.sampleSize) {
          this.send(OrderBookStatus.WARMING_UP, symbol); // WARMING_UP status
          if (this.historicalData.length === 0) {
            this.log(
              `Warmup period started for ${this.exchange} ${symbol} market`
            );
          }
        } else {
          this.send(OrderBookStatus.CONNECTED, symbol); // NORMAL status
        }

        this.addHistoricalData({ ...this.payload });
      }
    } catch (error) {
      this.log(`Process error: ${error.message}`);
      this.send(OrderBookStatus.ERROR, recv.data.coin); // ERROR status
    }
  }

  protected validatePayload(
    recv: any
  ): recv is { channel: string; data: HyperLiquidWsBook } {
    return (
      "channel" in recv &&
      "data" in recv &&
      "coin" in recv.data &&
      "levels" in recv.data &&
      Array.isArray(recv.data.levels) &&
      recv.data.levels.length === 2 &&
      Array.isArray(recv.data.levels[0]) &&
      Array.isArray(recv.data.levels[1]) &&
      "time" in recv.data
    );
  }

  protected send(orderBookStatus: OrderBookStatus, symbol: string): void {
    this.payload.status = orderBookStatus;
    this.broadcast();
  }

  public subscribe(): void {
    const message = JSON.stringify({
      method: "subscribe",
      subscription: { type: "l2Book", coin: this.symbol },
    });
    this.websocket.send(message);
    this.log(`Subscribed to  HyperLiquid ${this.symbol} order book.`);
  }

  protected connect(): void {
    this.log(`Attempting to connect to external WebSocket...`);

    try {
      this.websocket = new WebSocket(this.url);

      this.websocket.addEventListener("open", () => {
        this.status = OrderBookStatus.CONNECTED;
        this.reconnectAttempts = 0;
        this.log("WebSocket connection established.");
        this.subscribe(); // Subscribe after connection is established
      });

      this.websocket.addEventListener("close", (event) => {
        this.status = OrderBookStatus.ERROR;
        this.log(`WebSocket connection closed: ${event.reason}`);
        this.reconnect();
      });

      this.websocket.addEventListener("error", (event) => {
        this.log(`WebSocket error: ${event.message}`);
      });

      this.websocket.addEventListener("message", (message) => {
        this.handleMessage(message.data);
      });
    } catch (error) {
      this.log(`Failed to create WebSocket: ${error.message}`);
    }
  }

  public async fetchMarketRates(): Promise<OrderBookRates> {
    await this.rateLimiter.acquire(2);
    try {
      const response = await axios.post(
        "https://api.hyperliquid.xyz/info",
        {
          type: "metaAndAssetCtxs",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = this.parseMarketRates(response.data);
      if (data) {
        const rate = data.find((rate) => rate.market === this.symbol);
        if (rate) {
          return rate;
        }
      }
    } catch (error) {
      this.log(`Error fetching funding rate: ${error.message}`);
    }
    return {
      status: ExchangeRequestStatus.ERROR,
      market: this.symbol,
      fundingRate: 0,
      spot: 0,
      openInterest: 0,
      premium: 0,
    };
  }

  private parseMarketRates(response: any): OrderBookRates[] {
    const [universe, rates] = response;
    const marketRates: OrderBookRates[] = [];

    for (let i = 0; i < universe.universe.length; i++) {
      const market = universe.universe[i].name;
      const rateInfo = rates[i];

      const marketRate: OrderBookRates = {
        status: ExchangeRequestStatus.SUCCESS,
        market: market,
        fundingRate: parseFloat(rateInfo.funding),
        spot: parseFloat(rateInfo.markPx),
        openInterest: parseFloat(rateInfo.openInterest),
        premium: parseFloat(rateInfo.premium),
      };

      marketRates.push(marketRate);
    }

    return marketRates;
  }
}
