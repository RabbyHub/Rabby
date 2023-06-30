import { useAsync } from 'react-use';
import { useWallet } from '../WalletContext';
import { Summary } from '@rabby-wallet/rabby-api/dist/types';
import React from 'react';
import {
  MINI_ASSET_ID,
  MINI_DEBT_ID,
  Tokens,
  groupAssets,
  sumGrossWorth,
} from './assets';

export const useSummary = (
  addr: string | undefined,
  chain: string | null,
  updateNonce = 0
) => {
  const wallet = useWallet();
  const { value, loading } = useAsync(async (): Promise<
    Summary | undefined
  > => {
    if (addr) {
      return wallet.openapi.getSummarizedAssetList(addr, chain || undefined);
    }
  }, [addr, chain, updateNonce]);
  const data = React.useMemo(() => (value ? sumGrossWorth(value) : undefined), [
    value,
  ]);

  const list = React.useMemo(() => {
    const maxItem = Math.max.apply(
      null,
      (data?.list || []).map((x) => Math.abs(x._value))
    );

    const maxAssets = Math.max(data?.netWorth || 0, maxItem);

    return data?.list?.length ? groupAssets(data.list, maxAssets) : [];
  }, [data]);

  const filterList = React.useMemo(() => {
    const _list = chain
      ? list.filter((m) => {
          return !(m as Tokens).chain || (m as Tokens).chain === chain;
        })
      : list;

    return _list.map((x) => ({
      ...x,
      symbol:
        x.id === MINI_ASSET_ID
          ? 'Other small assets'
          : x.id === MINI_DEBT_ID
          ? 'Other small debts'
          : x.symbol,
      // _netWorth: formatNetworth(Math.abs(x._value)),
    }));
  }, [chain, list]);

  return {
    list: filterList,
    loading,
  };
};
