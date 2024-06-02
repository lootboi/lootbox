/**
 * Represents an order side.
 * @property {BID} BID - buy order
 * @property {ASK} ASK - sell order
 */
export enum OrderSide {
  BID,
  ASK,
}

/**
 * Represents an order in the system.
 * @property {string} px - price at this level
 * @property {string} sz - size
 * @property {number} n - number of orders at this price level
 */
export type Order = {
  px: string; // price at this level
  sz: string; // size
  n: number; // number of orders at this price level
};
