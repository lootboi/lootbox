import WebSocket from "ws";

import { IOrderBook } from "../interfaces/orderBook";
import { Position } from "../types/positions";

export abstract class Strategy {
  protected orderBook: IOrderBook;

  protected openPositions: { bids: Position[]; asks: Position[] } = {
    bids: [],
    asks: [],
  };

  protected historicalPositions: { bids: Position[]; asks: Position[] } = {
    bids: [],
    asks: [],
  };

  public maxLeverage: number;

  public realizedProfit: number = 0;
  public pnl: number = 0;
  public percentPnl: number = 0;

  public initialFunds: number;
  public availableFunds: number;
  public usedFunds: number;

  /**
   * Creates a new instance of the Strategy class.
   * @param orderBook The order book to be used by the strategy.
   * @param initialFunds The initial funds available for the strategy.
   */
  constructor(
    orderBook: IOrderBook,
    initialFunds: number,
    maxLeverage: number
  ) {
    this.orderBook = orderBook;
    this.maxLeverage = maxLeverage;
    this.initialFunds = initialFunds;
    this.availableFunds = initialFunds;
    this.usedFunds = 0;

    this.orderBookHandler();
  }

  /**
   * Listens to the order book updates and reacts accordingly.
   */
  protected orderBookHandler(): void {
    this.orderBook.internalWebSocket.on("message", (data: WebSocket.Data) => {
      this.handleOrderBookUpdate(data);
    });
  }

  /**
   * Handles updates to the order book.
   * @param data The data received from the order book update.
   */
  protected handleOrderBookUpdate(data: WebSocket.Data): void {
    // Process the updated order book data
    // This method should be implemented by subclasses
    this.log(`Order book updated: ${data.toString()}`);
  }

  /**
   * Starts the strategy.
   */
  public abstract start(): void;

  /**
   * Stops the strategy.
   */
  public abstract stop(): void;

  /**
   * Logs a message with a timestamp.
   * @param message The message to be logged.
   */
  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
}
