import { OrderBook } from "./src/classes/OrderBook";
import { HyperLiquidOrderBookHandler } from "./src/handlers/HyperLiquidOrderBookHandler";
import { SimpleMarketMakingStrategy } from "./src/strategies/SimpleStrategy";
import { Exchange } from "./src/types/exchange";

const market = "BTC";
const orderBookHandler = new HyperLiquidOrderBookHandler(8080, market, 100);
const orderBook = new OrderBook("BTC", orderBookHandler);

const strategy = new SimpleMarketMakingStrategy(orderBook, 0.2, 50);
strategy.start();
