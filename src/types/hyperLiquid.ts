import { Order } from "./orders";

export interface HyperLiquidWsBook {
  channel: string;
  data: { coin: string; levels: [Array<Order>, Array<Order>]; time: number };
}
