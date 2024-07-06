import WebSocket, { WebSocketServer } from "ws";

import { RateLimiter } from "./RateLimiter";
import { HyperLiquidExecutor } from "./Executor";

import {
  OrderBookPayload,
  OrderBookRates,
  OrderBookStatus,
} from "../types/orderBookHandler";

export abstract class OrderBookHandler {
  public exchangeName: string;
  protected url: string;
  public port: number;

  protected websocket: WebSocket;
  protected internalServer: WebSocketServer;
  protected rateLimiter: RateLimiter;
  protected executor: HyperLiquidExecutor;

  public reconnectInterval: number = 5000; // 5 seconds
  public maxReconnectAttempts: number = 10;
  public reconnectAttempts: number = 0;

  public status: { [symbol: string]: OrderBookStatus } = {};
  private requiredKeys: Set<string> = new Set();

  protected payloads: { [symbol: string]: OrderBookPayload } = {};
  public historicalData: { [symbol: string]: OrderBookPayload[] } = {};
  public sampleSize: number;

  constructor(
    sampleSize: number = 0,
    port: number,
    url: string,
    requiredKeys: string[] = []
  ) {
    this.sampleSize = sampleSize;
    this.url = url;
    this.port = port;
    this.addRequiredKeys(requiredKeys);
    this.internalServer = new WebSocketServer({ port });
    this.internalServer.on("connection", (ws) => {
      this.log("Client connected to internal WebSocket server.");
    });
    this.connect();
  }

  protected connect(): void {
    this.log(`Attempting to connect to external WebSocket... url: ${this.url}`);
    try {
      this.websocket = new WebSocket(this.url);

      this.websocket.addEventListener("open", () => {
        this.reconnectAttempts = 0;
        this.log("WebSocket connection established.");
        this.processPendingSubscriptions();
      });

      this.websocket.addEventListener("close", (event) => {
        this.log(`WebSocket connection closed: ${event.reason}`);
        this.reconnect();
      });

      this.websocket.addEventListener("error", (event) => {
        this.log(`WebSocket error: ${event}`);
      });

      this.websocket.addEventListener("message", (message) => {
        const data = JSON.parse(message.data.toString());
        const symbol = this.getSymbolFromMessage(data);
        if (symbol) {
          this.handleMessage(symbol, data);
        }
      });
    } catch (error) {
      this.log(`Failed to create WebSocket: ${error.message}`);
    }
  }

  private processPendingSubscriptions(): void {
    while (this.pendingSubscriptions.length > 0) {
      const symbol = this.pendingSubscriptions.shift();
      if (symbol) {
        this.sendSubscription(symbol);
      }
    }
  }

  protected abstract getSymbolFromMessage(data: any): string | null;
  protected abstract sendSubscription(symbol: string): void;
  public abstract fetchMarketRates(): Promise<OrderBookRates[]>;
  protected abstract handleMessage(symbol: string, data: any): void;
  protected abstract resync(symbol: string, recv: any): void;
  protected abstract process(symbol: string, recv: any): void;

  public reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.log(`Reconnecting WebSocket (attempt ${this.reconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      this.log("Max reconnect attempts reached. Giving up.");
    }
  }

  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  protected addRequiredKeys(keys: string[]): void {
    keys.forEach((key) => this.requiredKeys.add(key));
  }

  protected validatePayload(recv: any): boolean {
    return [...this.requiredKeys].every((key) => key in recv);
  }

  protected getWebSocketInstance(): WebSocket {
    return this.websocket;
  }

  protected broadcast(symbol: string): void {
    const message = JSON.stringify(this.payloads[symbol]);
    this.internalServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  protected addHistoricalData(symbol: string, sample: OrderBookPayload): void {
    if (!this.historicalData[symbol]) {
      this.historicalData[symbol] = [];
    }

    if (this.historicalData[symbol].length >= this.sampleSize) {
      this.historicalData[symbol].shift(); // Remove the oldest sample
    }
    this.historicalData[symbol].push(sample);
    this.updateStatusBasedOnHistoricalData(symbol);
  }

  protected updateStatusBasedOnHistoricalData(symbol: string): void {
    if (this.historicalData[symbol].length === this.sampleSize) {
      this.status[symbol] = OrderBookStatus.CONNECTED;
    } else if (this.historicalData[symbol].length > 0) {
      this.status[symbol] = OrderBookStatus.WARMING_UP;
    }
  }

  private pendingSubscriptions: string[] = [];

  public queueSubscription(symbol: string): void {
    this.pendingSubscriptions.push(symbol);
  }
}
