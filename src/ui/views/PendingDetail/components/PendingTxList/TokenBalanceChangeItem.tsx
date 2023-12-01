import { numberWithCommasIsLtOne } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import { PendingTxItem, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import React, { ReactNode } from 'react';
import IconToken from 'ui/assets/pending/icon-token.svg';

export const TokenBalanceChangeItem = ({
  item,
  prefix,
  tokenDict,
}: {
  item: NonNullable<
    PendingTxItem['pre_exec_result']
  >['balance_change']['send_token_list'][0];
  tokenDict?: Record<string, TokenItem>;
  prefix: ReactNode;
}) => {
  const uuid = `${item.chain || 'eth'}:${item.token_id}`;
  const token = tokenDict?.[uuid];

  return (
    <div className="flex items-center gap-[8px]">
      <img
        className="w-[18px] h-[18px] rounded-full"
        src={token?.logo_url || IconToken}
        alt=""
      />
      <div className="text-r-neutral-title-1 font-medium">
        {prefix} {numberWithCommasIsLtOne(item.amount, 2)}{' '}
        {getTokenSymbol(token)}
      </div>
    </div>
  );
};
