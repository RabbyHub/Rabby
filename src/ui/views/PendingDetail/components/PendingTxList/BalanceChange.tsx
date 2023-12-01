import { PendingTxItem } from '@rabby-wallet/rabby-api/dist/types';
import React from 'react';
import { NFTBalanceChangeItem } from './NFTBalanceChangeItem';
import { TokenBalanceChangeItem } from './TokenBalanceChangeItem';

export const BalanceChange = ({
  data,
  tokenDict,
}: {
  data?: NonNullable<PendingTxItem['pre_exec_result']>['balance_change'];
  tokenDict?: Record<string, any>;
}) => {
  const isEmpty = [
    'send_token_list',
    'receive_token_list',
    'send_nft_list',
    'receive_nft_list',
  ].every((key) => {
    return (data?.[key]?.length || 0) === 0;
  });
  if (!data) {
    return null;
  }
  if (isEmpty) {
    return <div>-</div>;
  }
  return (
    <div className="flex flex-col gap-[8px]">
      {data?.send_token_list?.map((item, index) => {
        return (
          <TokenBalanceChangeItem
            key={`${item.token_id}-${index}-send`}
            prefix="-"
            item={item}
            tokenDict={tokenDict}
          />
        );
      })}
      {data?.receive_token_list?.map((item, index) => {
        return (
          <TokenBalanceChangeItem
            key={`${item.token_id}-${index}-receive`}
            prefix="+"
            item={item}
            tokenDict={tokenDict}
          />
        );
      })}
      {data?.send_nft_list?.map((item, index) => {
        return (
          <NFTBalanceChangeItem
            key={`${item.token_id}-${index}-send`}
            prefix="-"
            item={item}
            tokenDict={tokenDict}
          />
        );
      })}
      {data?.receive_nft_list?.map((item, index) => {
        return (
          <NFTBalanceChangeItem
            key={`${item.token_id}-${index}-receive`}
            prefix="+"
            item={item}
            tokenDict={tokenDict}
          />
        );
      })}
    </div>
  );
};
