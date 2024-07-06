import { HYPER_LIQUID_URL } from "../constants/hyperliquid";

import {
  CancelPosition,
  CancelPositionByCloid,
  Grouping,
  ModifyPosition,
  Position,
} from "../types/hyperLiquid";

export class HyperLiquidExecutor {
  private apiUrl: string = HYPER_LIQUID_URL;

  /**
   * Places an order with the specified parameters.
   *
   * @param orders - An array of positions representing the orders to be placed.
   * @param grouping - The grouping option for the orders.
   * @param nonce - The nonce value for the order.
   * @param signature - The signature for the order.
   * @returns A Promise that resolves to the result of the order placement.
   */
  async placeOrder(
    orders: Position[],
    grouping: Grouping,
    nonce: number,
    signature: any
  ): Promise<any> {
    const action = {
      type: "order",
      orders,
      grouping,
    };
    return this._placeOrder(action, nonce, signature);
  }

  /**
   * Cancels the specified orders.
   *
   * @param cancels - An array of orders to cancel.
   * @param nonce - The nonce value.
   * @param signature - The signature value.
   * @returns A promise that resolves with the result of the cancellation.
   */
  async cancelOrders(
    cancels: CancelPosition[],
    nonce: number,
    signature: any
  ): Promise<any> {
    const action = {
      type: "cancel",
      cancels,
    };

    return this._placeOrder(action, nonce, signature);
  }

  /**
   * Cancels orders by CLOID.
   *
   * @param cancels - An array of `CancelPositionByCloid` objects representing the orders to be cancelled.
   * @param nonce - A number representing the nonce value.
   * @param signature - Any type representing the signature.
   * @returns A Promise that resolves to any value.
   */
  async cancelOrdersByCloid(
    cancels: CancelPositionByCloid[],
    nonce: number,
    signature: any
  ): Promise<any> {
    const action = {
      type: "cancelByCloid",
      cancels,
    };

    return this._placeOrder(action, nonce, signature);
  }

  /**
   * Modifies an order with the specified parameters.
   * @param oid - The ID of the order to modify.
   * @param order - The updated order object.
   * @param nonce - The nonce value for the request.
   * @param signature - The signature for the request.
   * @returns A Promise that resolves to the modified order.
   */
  async modifyOrder(
    oid: number,
    order: Position,
    nonce: number,
    signature: any
  ): Promise<any> {
    const action = {
      type: "modify",
      oid,
      order,
    };

    return this._placeOrder(action, nonce, signature);
  }

  /**
   * Modifies multiple orders in a batch.
   * @param modifies - An array of ModifyPosition objects representing the modifications to be made.
   * @param nonce - A number representing the nonce value.
   * @param signature - Any type representing the signature.
   * @returns A Promise that resolves to any value.
   */
  async batchModifyOrders(
    modifies: ModifyPosition[],
    nonce: number,
    signature: any
  ): Promise<any> {
    const action = {
      type: "batchModify",
      modifies,
    };

    return this._placeOrder(action, nonce, signature);
  }

  /**
   * Updates the leverage for a given asset.
   *
   * @param asset - The asset to update the leverage for.
   * @param isCross - A boolean indicating whether to use cross leverage.
   * @param leverage - The new leverage value.
   * @param nonce - The nonce value.
   * @param signature - The signature value.
   * @returns A Promise that resolves to the result of the order placement.
   */
  async updateLeverage(
    asset: number,
    isCross: boolean,
    leverage: number,
    nonce: number,
    signature: any
  ): Promise<any> {
    const action = {
      type: "updateLeverage",
      asset,
      isCross,
      leverage,
    };

    return this._placeOrder(action, nonce, signature);
  }

  /**
   * Updates the isolated margin for a given asset.
   *
   * @param asset - The asset to update the isolated margin for.
   * @param isBuy - A boolean indicating whether the action is a buy or sell.
   * @param ntli - The ntli value.
   * @param nonce - The nonce value.
   * @param signature - The signature value.
   * @returns A Promise that resolves to the result of the placeOrder method.
   */
  async updateIsolatedMargin(
    asset: number,
    isBuy: boolean,
    ntli: number,
    nonce: number,
    signature: any
  ): Promise<any> {
    const action = {
      type: "updateIsolatedMargin",
      asset,
      isBuy,
      ntli,
    };

    return this._placeOrder(action, nonce, signature);
  }

  /**
   * Places an order by sending a POST request to the API endpoint.
   * @param action - The action to be performed.
   * @param nonce - The nonce value.
   * @param signature - The signature value.
   * @returns A Promise that resolves to the JSON response from the API.
   */
  async _placeOrder(action: any, nonce: number, signature: string) {
    const payload = {
      action,
      nonce,
      signature,
    };

    const response = await fetch(`${this.apiUrl}/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return response.json();
  }
}
