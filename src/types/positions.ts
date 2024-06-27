import { OrderSide } from "./orders";
import { SupportedExchanges } from "./exchange";

/**
 * Represents an order status.
 * @property {OPEN} OPEN - order is open, not yet filled
 * @property {CLOSED} CLOSED - order is closed
 * @property {FILLED} FILLED - order has been filled
 * @property {CANCELLED} CANCELLED - order has been cancelled
 */
export enum PositionStatus {
  OPEN,
  CLOSED,
  FILLED,
  CANCELLED,
}

/**
 * Represents a strategy order.
 * @property {OrderSide} side - side of the Position
 * @property {string} px - price
 * @property {string} m - margin
 * @property {string} sz - size
 * @property {PositionStatus} status - status of the order
 * @property {string} fpx - filled price (only for filled Position)
 */
export type Position = {
  ex: SupportedExchanges;
  side: OrderSide;
  px: string;
  m: string;
  sz: string;
  status: PositionStatus;
  fpx?: string;
};
