// Last traded price of the market on screen, published straight from the trades
// WebSocket callback.
//
// Deliberately not React state and not in the store: the browser-tab title
// reads it, and that has to keep ticking while the tab is in the background,
// where requestAnimationFrame (which batches the trades list) is paused. It also
// keeps a per-trade update from re-rendering every `state.perps` subscriber.

interface LastTradePrice {
  coin: string;
  price: string;
}

type Listener = (value: LastTradePrice) => void;

let current: LastTradePrice | null = null;
const listeners = new Set<Listener>();

export const publishLastTradePrice = (coin: string, price: string) => {
  if (current?.coin === coin && current.price === price) return;
  current = { coin, price };
  listeners.forEach((listener) => listener(current as LastTradePrice));
};

/** Latest trade price for `coin`, or undefined until one has arrived. */
export const getLastTradePrice = (coin: string) =>
  current?.coin === coin ? current.price : undefined;

export const subscribeLastTradePrice = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
