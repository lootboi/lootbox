import { Exchange } from "../types/exchange";

export class RateLimiter {
  private exchange: Exchange;

  private maxTokens: number;
  private refillRate: number;
  private tokens: number;
  private lastRefill: number;

  constructor(exchange: Exchange, maxTokens: number, refillRate: number) {
    this.exchange = exchange;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refillTokens() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = Math.floor(elapsed * this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  public async acquire(tokensRequired: number): Promise<void> {
    this.refillTokens();

    if (tokensRequired > this.tokens) {
      const waitTime =
        ((tokensRequired - this.tokens) / this.refillRate) * 1000;

      this.log(
        `API Rate limit exceeded for ${this.exchange}. Waiting ${waitTime}ms to acquire ${tokensRequired} tokens.`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refillTokens();
    }

    this.tokens -= tokensRequired;
  }

  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
}
