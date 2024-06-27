export interface HyperLiquidMarket {
  maxLeverage: number;
  name: string;
  szDecimals: number;
}

export interface HyperLiquidMarkets {
  [key: string]: HyperLiquidMarket;
}
