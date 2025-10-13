import type { GasLevel, Tx } from '@rabby-wallet/rabby-api/dist/types';

export type LastGasSelection = {
  lastTimeSelect?: 'gasPrice' | 'gasLevel';
  gasLevel?: GasLevel['level'];
  gasPrice?: number; // in wei
};

export type GasSelectionFlags = {
  isSend?: boolean;
  isSwap?: boolean;
  isBridge?: boolean;
  isSpeedUp?: boolean;
  isCancel?: boolean;
};

export function computeCustomGasPrice({
  txs,
  flags,
  lastSelection,
}: {
  txs: Tx[];
  flags?: GasSelectionFlags;
  lastSelection?: LastGasSelection;
}): number {
  let customGasPrice = 0;
  if (lastSelection?.lastTimeSelect === 'gasPrice' && lastSelection.gasPrice) {
    customGasPrice = lastSelection.gasPrice;
  }

  const first = txs[0];
  const originGasPriceHex = (first.gasPrice || (first as any).maxFeePerGas) as
    | string
    | undefined;
  if (
    ((flags?.isSend || flags?.isSwap || flags?.isBridge) &&
      originGasPriceHex) ||
    flags?.isSpeedUp ||
    flags?.isCancel
  ) {
    if (originGasPriceHex) {
      try {
        customGasPrice = parseInt(originGasPriceHex);
      } catch (err) {
        console.log('parseInt customGasPrice error', err);
      }
    }
  }
  return customGasPrice || 0;
}

export function selectInitialGas({
  gasList,
  flags,
  lastSelection,
  customGasPrice,
}: {
  gasList: GasLevel[];
  flags?: GasSelectionFlags;
  lastSelection?: LastGasSelection;
  customGasPrice?: number;
}): GasLevel {
  if (
    ((flags?.isSend || flags?.isSwap || flags?.isBridge) && customGasPrice) ||
    flags?.isSpeedUp ||
    flags?.isCancel ||
    lastSelection?.lastTimeSelect === 'gasPrice'
  ) {
    return gasList.find((g) => g.level === 'custom') || gasList[0];
  }
  if (lastSelection?.lastTimeSelect === 'gasLevel' && lastSelection.gasLevel) {
    const t = gasList.find((g) => g.level === lastSelection.gasLevel);
    if (t) return t;
  }
  return gasList.find((g) => g.level === 'normal') || gasList[0];
}
