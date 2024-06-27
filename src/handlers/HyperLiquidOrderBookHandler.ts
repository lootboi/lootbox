import WebSocket from "ws";
import axios from "axios";

import {
  ExchangeRequestStatus,
  OrderBookRates,
  OrderBookStatus,
} from "../types/orderBookHandler";
import { SupportedExchanges } from "../types/exchange";
import { HyperLiquidWsBook } from "../types/hyperLiquid";

import { OrderBookHandler } from "../classes/OrderBookHandler";
import { RateLimiter } from "../classes/RateLimiter";

import { ExchangeConfigs } from "../config";
import { HyperLiquidPairs } from "../constants/hyperliquid";

export class HyperLiquidOrderBookHandler extends OrderBookHandler {
  public exchange = SupportedExchanges.HYPER_LIQUID;
  private updateIds: { [symbol: string]: number } = {};

  constructor(port: number, sampleSize: number = 0) {
    super(
      sampleSize,
      port,
      ExchangeConfigs.get(SupportedExchanges.HYPER_LIQUID)
        ?.orderBookWss as string,
      ["coin", "levels", "time"]
    );
    this.rateLimiter = new RateLimiter(
      SupportedExchanges.HYPER_LIQUID,
      1200,
      1200 / 60
    );
  }

  protected sendSubscription(symbol: string): void {
    const message = JSON.stringify({
      method: "subscribe",
      subscription: { type: "l2Book", coin: symbol },
    });
    this.getWebSocketInstance().send(message);
    this.log(`Subscribed to HyperLiquid ${symbol} order book.`);
  }

  protected getSymbolFromMessage(data: any): string | null {
    if (data && data.data && data.data.coin) {
      return data.data.coin;
    }
    return null;
  }

  protected handleMessage(symbol: string, data: WebSocket.Data): void {
    const message = data;

    try {
      const parsedData = JSON.parse(JSON.stringify(message));

      // Handle subscription response
      if (parsedData.channel === "subscriptionResponse") {
        const coin = parsedData.data.subscription.coin;
        this.log(`Successfully subscribed to ${coin} order book.`);
        return;
      }

      const recv: HyperLiquidWsBook = parsedData;

      if (this.validatePayload(recv)) {
        const updateId = recv.data.time;
        if (symbol in this.updateIds) {
          if (updateId <= this.updateIds[symbol]) {
            this.log(`Duplicate or old update for ${symbol}, ignoring.`);
            return; // Duplicate or old update, ignore
          }
          this.updateIds[symbol] = updateId;
          this.process(symbol, recv);
        } else {
          this.updateIds[symbol] = updateId;
          this.resync(symbol, recv);
        }
      } else {
        this.send(OrderBookStatus.ERROR, symbol); // ERROR status
      }
    } catch (error) {
      this.log(`Error processing message for ${symbol}: ${error.message}`);
    }
  }

  protected resync(symbol: string, recv: HyperLiquidWsBook): void {
    try {
      this.payloads[symbol] = {
        ...this.payloads[symbol],
        ts: recv.data.time,
        localTs: Date.now(),
        bids: recv.data.levels[0],
        asks: recv.data.levels[1],
      };
      this.send(OrderBookStatus.RESYNCING, symbol); // RESYNC status
    } catch (error) {
      this.log(`Resync error: ${error.message}`);
      this.send(OrderBookStatus.ERROR, symbol); // ERROR status
    }
  }

  protected process(symbol: string, recv: HyperLiquidWsBook): void {
    try {
      this.payloads[symbol] = {
        ...this.payloads[symbol],
        ts: recv.data.time,
        localTs: Date.now() / 1000,
        bids: recv.data.levels[0],
        asks: recv.data.levels[1],
      };

      if (this.sampleSize === 0) {
        this.send(OrderBookStatus.CONNECTED, symbol); // NORMAL status
      } else {
        if (!this.historicalData[symbol]) {
          this.historicalData[symbol] = [];
        }

        if (this.historicalData[symbol].length < this.sampleSize) {
          this.send(OrderBookStatus.WARMING_UP, symbol); // WARMING_UP status
          if (this.historicalData[symbol].length === 0) {
            this.log(
              `Warmup period started for ${this.exchange} ${symbol} market`
            );
          }
        } else {
          this.send(OrderBookStatus.CONNECTED, symbol); // NORMAL status
        }

        this.addHistoricalData(symbol, { ...this.payloads[symbol] });
      }
    } catch (error) {
      this.log(`Process error: ${error.message}`);
      this.send(OrderBookStatus.ERROR, symbol); // ERROR status
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
    this.payloads[symbol].status = orderBookStatus;
    this.broadcast(symbol);
  }

  public async fetchMarketRates(): Promise<OrderBookRates[]> {
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
        return data;
      }
    } catch (error) {
      this.log(`Error fetching market rates for HyperLiquid: ${error.message}`);
    }
    // For the length of the universe, return an error status
    return Array.from(Object.keys(HyperLiquidPairs), () => ({
      status: ExchangeRequestStatus.ERROR,
      market: "",
      fundingRate: 0,
      spot: 0,
      openInterest: 0,
      premium: 0,
    }));
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
