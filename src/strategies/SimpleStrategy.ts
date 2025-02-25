import WebSocket from "ws";

import { OrderBook } from "../classes/OrderBook";
import { Strategy } from "../classes/Strategy";

import { OrderBookRates } from "../types/orderBookHandler";
import { OrderSide } from "../types/orders";

export class SimpleMarketMakingStrategy extends Strategy {
  private evaluationInterval: number = 5000; // Evaluate strategy every 5 seconds
  private rateSampleSize: number = 100; // Number of historical rates to keep
  private historicalRates: OrderBookRates[] = [];
  private historicalPrices: number[] = []; // Store historical prices for volatility and moving average calculations

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

  private evaluateStrategy(): void {
    if (!this.orderBook.initialized) {
      this.log("Order book not initialized. Skipping evaluation.");
      return;
    }

    const rates = this.orderBook.rates;
    const dynamicFundingRateThreshold =
      this.calculateDynamicFundingRateThreshold();
    const volatility = this.calculatePriceVolatility();
    const averageVolatility = this.calculatePriceVolatility();
    const sma = this.calculateSimpleMovingAverage(20);

    const minFundingRateThreshold = 0.0001; // 0.01%
    const minVolatilityRatio = 1.2; // Current volatility should be 20% higher than average
    const significantPremium = 0.001; // 0.1%

    const reasons: string[] = [];

    if (
      rates.fundingRate >
        Math.max(dynamicFundingRateThreshold, minFundingRateThreshold) &&
      volatility > averageVolatility * minVolatilityRatio &&
      rates.spot > sma &&
      rates.premium > significantPremium
    ) {
      // Consider short position (sell)
      this.executeTrade(OrderSide.ASK, rates.spot, rates.fundingRate);
    } else if (
      rates.fundingRate <
        -Math.max(dynamicFundingRateThreshold, minFundingRateThreshold) &&
      volatility > averageVolatility * minVolatilityRatio &&
      rates.spot < sma &&
      rates.premium < -significantPremium
    ) {
      // Consider long position (buy)
      this.executeTrade(OrderSide.BID, rates.spot, rates.fundingRate);
    } else {
      if (
        rates.fundingRate <=
          Math.max(dynamicFundingRateThreshold, minFundingRateThreshold) &&
        rates.fundingRate >=
          -Math.max(dynamicFundingRateThreshold, minFundingRateThreshold)
      ) {
        reasons.push(
          `Funding rate (${rates.fundingRate}) is within threshold (±${Math.max(
            dynamicFundingRateThreshold,
            minFundingRateThreshold
          )})`
        );
      }
      if (volatility <= averageVolatility * minVolatilityRatio) {
        reasons.push(
          `Volatility (${volatility}) is not significantly higher than average (${
            averageVolatility * minVolatilityRatio
          })`
        );
      }
      if (
        (rates.fundingRate > 0 && rates.spot <= sma) ||
        (rates.fundingRate < 0 && rates.spot >= sma)
      ) {
        reasons.push(
          `Spot price (${rates.spot}) is not ${
            rates.fundingRate > 0 ? "above" : "below"
          } SMA (${sma})`
        );
      }
      if (Math.abs(rates.premium) <= significantPremium) {
        reasons.push(
          `Premium (${rates.premium}) is not significant (±${significantPremium})`
        );
      }

      this.log(`No trading action taken. Reasons: ${reasons.join(", ")}`);
    }

    this.log(`Market Rates: ${JSON.stringify(rates)}`);
    this.log(`Dynamic Funding Rate Threshold: ${dynamicFundingRateThreshold}`);
    this.log(`Price Volatility: ${volatility}`);
    this.log(`Average Volatility: ${averageVolatility}`);
    this.log(`Simple Moving Average: ${sma}`);
  }

  private executeTrade(
    side: OrderSide,
    price: number,
    fundingRate: number
  ): void {
    // Implement the trade execution logic
    const positionSize = this.calculatePositionSize(price, fundingRate);
    this.log(
      `Executing ${
        side === OrderSide.BID ? "buy" : "sell"
      } trade of size ${positionSize} at price: ${price}`
    );
    // Add trade execution logic using the calculated position size
  }

  private calculatePositionSize(price: number, fundingRate: number): number {
    // Calculate position size based on available funds, price, and max leverage
    const positionSize = (this.initialFunds * this.maxLeverage) / price;
    return positionSize;
  }

  private updateHistoricalRates(rates: OrderBookRates): void {
    if (this.historicalRates.length >= this.rateSampleSize) {
      this.historicalRates.shift(); // Remove the oldest sample

      this.orderBook.initialized = true;
    }

    this.historicalRates.push(rates);
  }

  private updateHistoricalPrices(price: number): void {
    if (this.historicalPrices.length >= this.rateSampleSize) {
      this.historicalPrices.shift(); // Remove the oldest price
    }
    this.historicalPrices.push(price);
  }

  private calculateDynamicFundingRateThreshold(): number {
    if (this.historicalRates.length < 2) {
      return 0.0001; // Default threshold if not enough data
    }

    // Example calculation: based on standard deviation of historical funding rates
    const fundingRates = this.historicalRates.map((data) => data.fundingRate);
    const mean =
      fundingRates.reduce((sum, rate) => sum + rate, 0) / fundingRates.length;
    const variance =
      fundingRates.reduce((sum, rate) => sum + (rate - mean) ** 2, 0) /
      fundingRates.length;
    const standardDeviation = Math.sqrt(variance);

    return mean + 2 * standardDeviation; // Example: mean + 2 standard deviations as the threshold
  }

  private calculatePriceVolatility(): number {
    if (this.historicalPrices.length < 2) {
      return 0; // Not enough data to calculate volatility
    }

    const returns = this.historicalPrices.slice(1).map((price, index) => {
      const prevPrice = this.historicalPrices[index];
      return (price - prevPrice) / prevPrice;
    });

    const meanReturn =
      returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const squaredDiffs = returns.map((ret) => (ret - meanReturn) ** 2);
    const variance =
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(returns.length); // Annualized volatility

    return volatility;
  }

  private calculateSimpleMovingAverage(period: number): number {
    if (this.historicalPrices.length < period) {
      return 0; // Not enough data to calculate SMA
    }

    const sma =
      this.historicalPrices
        .slice(-period)
        .reduce((sum, price) => sum + price, 0) / period;

    return sma;
  }

  protected async handleOrderBookUpdate(data: WebSocket.Data): Promise<void> {
    if (this.orderBook.initialized) {
      await this.orderBook.fetchMarketRates();
      this.updateHistoricalRates(this.orderBook.rates);
      this.updateHistoricalPrices(this.orderBook.rates.spot); // Update historical prices
      this.log(`${JSON.stringify(this.orderBook.rates)}`);
    }
  }
}
