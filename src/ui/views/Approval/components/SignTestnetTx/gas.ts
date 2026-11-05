import { GasLevel, Tx } from '@rabby-wallet/rabby-api/dist/types';
import { intToHex } from '@ethereumjs/util';
import BigNumber from 'bignumber.js';
import { omit } from 'lodash';

const HEX_QUANTITY_RE = /^0x[0-9a-fA-F]+$/;

const isHexQuantity = (value: unknown): value is string =>
  typeof value === 'string' && HEX_QUANTITY_RE.test(value);

const clampPriorityFee = (priorityFee: number, maxFee: number) => {
  if (!Number.isFinite(priorityFee) || priorityFee < 0) {
    return maxFee;
  }
  return Math.min(Math.round(priorityFee), maxFee);
};

/**
 * Writes the selected gas level into the tx: type-2 fee fields when the
 * chain and keyring support EIP-1559, a legacy gasPrice otherwise.
 */
export const applyCustomNetworkGas = ({
  tx,
  gas,
  support1559,
}: {
  tx: Tx;
  gas: Pick<GasLevel, 'price' | 'priority_price'>;
  support1559: boolean;
}): Tx => {
  const price = Math.max(0, Math.round(gas.price));
  if (support1559) {
    return {
      ...omit(tx, 'gasPrice'),
      maxFeePerGas: intToHex(price),
      maxPriorityFeePerGas: intToHex(
        clampPriorityFee(gas.priority_price ?? price, price)
      ),
    };
  }
  return {
    ...omit(tx, ['maxFeePerGas', 'maxPriorityFeePerGas']),
    gasPrice: intToHex(price),
  };
};

/**
 * Tip for the custom level. A price taken from the request (dapp gas fields,
 * speed up, cancel, send) keeps the request's tip, or the full price when the
 * request only set a gasPrice. A cached custom price uses the cached tip, or
 * the market tip.
 */
export const resolveCustomGasPriorityFee = ({
  price,
  fromRequest,
  requestPriorityFee,
  cachedPriorityFee,
  marketPriorityFee,
}: {
  price: number;
  fromRequest: boolean;
  requestPriorityFee?: number | null;
  cachedPriorityFee?: number | null;
  marketPriorityFee?: number | null;
}) => {
  const priorityFee = fromRequest
    ? requestPriorityFee ?? price
    : cachedPriorityFee ?? marketPriorityFee ?? price;
  return clampPriorityFee(priorityFee, price);
};

type PricedGas = Pick<GasLevel, 'price'> &
  Partial<Pick<GasLevel, 'priority_price' | 'base_fee'>>;

/** Gas price the chain is expected to charge, used for the displayed cost. */
export const getCustomNetworkEffectiveGasPrice = (
  gas: PricedGas,
  support1559: boolean
) => {
  if (!support1559 || typeof gas.base_fee !== 'number') {
    return gas.price;
  }
  const priorityFee = clampPriorityFee(
    gas.priority_price ?? gas.price,
    gas.price
  );
  return Math.min(gas.price, gas.base_fee + priorityFee);
};

/**
 * Expected cost in native token units. Pass the level actually being priced:
 * levels with the same max fee can carry different tips.
 */
export const getCustomNetworkGasCost = ({
  gas,
  gasUsed,
  support1559,
}: {
  gas: PricedGas;
  gasUsed?: string | number;
  support1559: boolean;
}) =>
  new BigNumber(getCustomNetworkEffectiveGasPrice(gas, support1559))
    .multipliedBy(gasUsed || 0)
    .div(1e18);

/** Fail closed: a tx must carry exactly one complete set of fee fields. */
export const hasValidCustomNetworkGasFields = (
  tx: Pick<Tx, 'gasPrice' | 'maxFeePerGas' | 'maxPriorityFeePerGas'>,
  support1559: boolean
) => {
  if (support1559) {
    return (
      tx.gasPrice === undefined &&
      isHexQuantity(tx.maxFeePerGas) &&
      isHexQuantity(tx.maxPriorityFeePerGas) &&
      BigInt(tx.maxPriorityFeePerGas) <= BigInt(tx.maxFeePerGas)
    );
  }
  return (
    tx.maxFeePerGas === undefined &&
    tx.maxPriorityFeePerGas === undefined &&
    isHexQuantity(tx.gasPrice)
  );
};
