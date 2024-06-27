import { OrderBook } from "./src/classes/OrderBook";
import { Exchange } from "./src/classes/Exchange";

import { HyperLiquidOrderBookHandler } from "./src/handlers/HyperLiquidOrderBookHandler";
import { SimpleMarketMakingStrategy } from "./src/strategies/SimpleStrategy";

/**
 * @todo
 * 1. Currently making a new book for each instance of the strategy and one every time a new market is added.
 *    This is not ideal as it will create a new websocket connection for each book. Refactor to use a single
 *    websocket connection for all books.
 *
 * 2. Strategy is currently only logging for the first market added. Refactor to log for all markets.
 *
 * 3. For each update sent from the internal websocket server, send a message that helps to identify the market and the exchange.
 *    For example, the message could be in the format: "{market}_{SupportedExchange}_{timestamp}"
 */

const port = 8080;
const sampleSize = 10;

const hyperLiquidHandler = new HyperLiquidOrderBookHandler(port, sampleSize);
const perpetualExchange = new Exchange();
perpetualExchange.setOrderBookHandler(hyperLiquidHandler);

const btcStrategy = new SimpleMarketMakingStrategy(
  new OrderBook("BTC", hyperLiquidHandler),
  10000,
  50
);

perpetualExchange.addMarket("BTC", btcStrategy);

perpetualExchange.startStrategies();
