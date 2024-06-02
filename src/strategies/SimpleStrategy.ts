import WebSocket from "ws";

import { OrderBook } from "../classes/OrderBook";
import { Strategy } from "../classes/Strategy";

import { ExchangeRequestStatus } from "../types/orderBookHandler";
import { OrderSide } from "../types/orders";

export class SimpleMarketMakingStrategy extends Strategy {
  private fundingRateThreshold: number = 0.0001; // Example threshold, adjust based on your strategy
  private evaluationInterval: number = 10000; // Evaluate strategy every 60 seconds

  constructor(orderBook: OrderBook, initialFunds: number, maxLeverage: number) {
    super(orderBook, initialFunds, maxLeverage);
  }

  public start(): void {
    this.log("Starting Simple Market Making Strategy");
    this.evaluateStrategy(); // Initial evaluation
    setInterval(() => this.evaluateStrategy(), this.evaluationInterval); // Periodic evaluation
  }

  public stop(): void {
    this.log("Stopping Simple Market Making Strategy");
    // Implement any cleanup logic if necessary
  }

  private async evaluateStrategy(): Promise<void> {
    if (!this.orderBook.initialized) {
      this.log("Order book is not initialized. Waiting...");
      return;
    }

    const rates = await this.orderBook.getMarketRates();

    if (rates.status !== ExchangeRequestStatus.SUCCESS) {
      this.log("Failed to fetch market rates.");
      return;
    }

    this.log(`Market Rates: ${JSON.stringify(rates)}`);

    if (rates.fundingRate > this.fundingRateThreshold) {
      this.log(
        `Funding rate is high (${rates.fundingRate}). Considering short position.`
      );
      this.executeTrade(OrderSide.ASK, rates.spot);
    } else if (rates.fundingRate < -this.fundingRateThreshold) {
      this.log(
        `Funding rate is low (${rates.fundingRate}). Considering long position.`
      );
      this.executeTrade(OrderSide.BID, rates.spot);
    } else {
      this.log("Funding rate is within the threshold. No action taken.");
    }
  }

  private executeTrade(side: OrderSide, price: number): void {
    // Implement the trade execution logic
    // This could include placing an order through an exchange API or any other trade mechanism
    this.log(
      `Executing ${
        side === OrderSide.BID ? "buy" : "sell"
      } trade at price: ${price}`
    );
  }

  protected async handleOrderBookUpdate(data: WebSocket.Data): Promise<void> {
    if (this.orderBook.initialized) {
      const rates = await this.orderBook.getMarketRates();
      this.log(`${JSON.stringify(rates)}`);
    }
  }
}
