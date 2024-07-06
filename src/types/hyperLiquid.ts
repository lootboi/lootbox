import { Order } from "./orders";

export interface HyperLiquidWsBook {
  channel: string;
  data: { coin: string; levels: [Array<Order>, Array<Order>]; time: number };
}

export interface Position {
  a: number;
  b: boolean;
  p: string;
  s: string;
  r: boolean;
  t: {
    limit?: {
      tif: "Alo" | "Ioc" | "Gtc";
    };
    trigger?: {
      isMarket: boolean;
      triggerPx: string;
      tpsl: "tp" | "sl";
    };
  };
  c?: string;
}

export interface CancelPosition {
  a: number;
  o: number;
}

export interface CancelPositionByCloid {
  asset: number;
  cloid: string;
}

export interface ModifyPosition {
  oid: number;
  order: Position;
}

export type Grouping = "na" | "normalTpsl" | "positionTpsl";