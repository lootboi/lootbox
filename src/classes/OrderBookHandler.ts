import WebSocket from "ws";
import { Server as WebSocketServer } from "ws";

import {
  OrderBookStatus,
  OrderBookPayload,
  OrderBookRates,
} from "../types/orderBookHandler";
import { Exchange } from "../types/exchange";
import { RateLimiter } from "./RateLimiter";

export abstract class OrderBookHandler {
  public exchange: Exchange;
  protected url: string;
  public port: number;

  protected websocket: WebSocket;
  private internalServer: WebSocketServer;
  protected rateLimiter: RateLimiter;

  public reconnectInterval: number = 5000; // 5 seconds
  public maxReconnectAttempts: number = 10;
  public reconnectAttempts: number = 0;

  public status: OrderBookStatus = OrderBookStatus.INITIALIZING;
  private requiredKeys: Set<string> = new Set();

  protected payload: OrderBookPayload = {
    ex: Exchange.UNKNOWN,
    symbol: "",
    status: OrderBookStatus.INITIALIZING,
    ts: 0,
    localTs: 0,
    bids: [],
    asks: [],
  };

  public historicalData: OrderBookPayload[] = [];
  public sampleSize: number;

  constructor(
    exchange: Exchange,
    symbol: string,
    sampleSize: number = 0,
    port: number,
    url: string,
    requiredKeys: string[] = []
  ) {
    this.exchange = exchange;
    this.payload.ex = this.exchange;
    this.payload.symbol = symbol;
    this.sampleSize = sampleSize;
    this.url = url;
    this.port = port;
    this.addRequiredKeys(requiredKeys);
    this.internalServer = new WebSocketServer({ port });
    this.internalServer.on("connection", (ws) => {
      ws.send(JSON.stringify(this.payload)); // Send initial payload
      this.log("Client connected to internal WebSocket server.");
    });
    this.connect();
  }

  protected connect(): void {
    this.log(`Attempting to connect to external WebSocket... url: ${this.url}`);
    try {
      this.websocket = new WebSocket(this.url);

      this.websocket.addEventListener("open", () => {
        this.status = OrderBookStatus.INITIALIZING;
        this.reconnectAttempts = 0;
        this.log("WebSocket connection established.");
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

  protected broadcast(): void {
    const message = JSON.stringify(this.payload);
    this.internalServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  protected addHistoricalData(sample: OrderBookPayload): void {
    if (this.historicalData.length >= this.sampleSize) {
      this.historicalData.shift(); // Remove the oldest sample
    }
    this.historicalData.push(sample);
    this.updateStatusBasedOnHistoricalData();
  }

  protected updateStatusBasedOnHistoricalData(): void {
    if (this.historicalData.length === this.sampleSize) {
      this.status = OrderBookStatus.CONNECTED;
    } else if (this.historicalData.length > 0) {
      this.status = OrderBookStatus.WARMING_UP;
    }
  }

  public abstract fetchMarketRates(): Promise<OrderBookRates>;
  protected abstract handleMessage(data: any): void;
  protected abstract resync(recv: any): void;
  protected abstract process(recv: any): void;
}
