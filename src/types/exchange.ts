/**
 * Represents an exchange.
 * @property {HYPER_LIQUID} HYPER_LIQUID - Hyper Liquid exchange
 */
export enum Exchange {
  UNKNOWN = "Unknown",
  HYPER_LIQUID = "HyperLiquid",
}

export type ExchangeConfig = {
  name: Exchange;
  orderBookWss: string;
};
