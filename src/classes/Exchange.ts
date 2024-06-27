import { OrderBookHandler } from "./OrderBookHandler";
import { OrderBook } from "./OrderBook";
import { Strategy } from "./Strategy";

export class Exchange {
  private orderBookHandler: OrderBookHandler;

  private orderBooks: { [market: string]: OrderBook } = {};
  private strategies: { [market: string]: Strategy } = {};

  constructor() {}

  public setOrderBookHandler(orderBookHandler: OrderBookHandler): void {
    this.orderBookHandler = orderBookHandler;
  }

  public addMarket(market: string, strategy: Strategy): void {
    const orderBook = new OrderBook(market, this.orderBookHandler);
    this.orderBooks[market] = orderBook;
    this.strategies[market] = strategy;
    this.orderBookHandler.queueSubscription(market); // Queue subscription
  }

  public startStrategies(): void {
    for (const market in this.strategies) {
      this.strategies[market].start();
    }
  }

  public stopStrategies(): void {
    for (const market in this.strategies) {
      this.strategies[market].stop();
    }
  }
}
