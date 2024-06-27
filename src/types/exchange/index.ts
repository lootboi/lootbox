/**
 * Represents an exchange.
 * @property {HYPER_LIQUID} HYPER_LIQUID - Hyper Liquid exchange
 */
export enum SupportedExchanges {
  UNKNOWN = "Unknown",
  HYPER_LIQUID = "HyperLiquid",
}

export type ExchangeConfig = {
  name: SupportedExchanges;
  orderBookWss: string;
};
