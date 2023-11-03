import { numberWithCommasIsLtOne } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import {
  NFTItem,
  PendingTxItem,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import NFTAvatar from '../../../Dashboard/components/NFT/NFTAvatar';

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
  const token = tokenDict?.[item.token_id];
  return (
    <div className="flex items-center gap-[8px]">
      <img
        className="w-[16px] h-[16px]"
        src={token?.logo_url || IconUnknown}
        alt=""
      />
      <div className="text-r-neutral-title-1 font-medium">
        {prefix} {numberWithCommasIsLtOne(item.amount, 2)}{' '}
        {getTokenSymbol(token)}
      </div>
    </div>
  );
};

export const NFTBalanceChangeItem = ({
  item,
  prefix,
  tokenDict,
}: {
  item: NonNullable<
    PendingTxItem['pre_exec_result']
  >['balance_change']['send_nft_list'][0];
  prefix: ReactNode;
  tokenDict?: Record<string, NFTItem>;
}) => {
  const { t } = useTranslation();
  const token = tokenDict?.[item.token_id];
  const symbol = '';
  const name =
    token?.name ||
    (symbol ? `${symbol} ${token?.inner_id}` : t('global.unknownNFT'));
  return (
    <div className="flex items-center gap-[8px]">
      <NFTAvatar
        className="w-[16px] h-[16px]"
        thumbnail
        content={token?.content}
        type={token?.content_type}
      ></NFTAvatar>
      <div className="text-r-neutral-title-1 font-medium">
        {prefix} {name}
      </div>
    </div>
  );
};

const BalanceChange = ({
  data,
  tokenDict,
}: {
  data?: NonNullable<PendingTxItem['pre_exec_result']>['balance_change'];
  tokenDict?: Record<string, any>;
}) => {
  if (!data) {
    return null;
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
          />
        );
      })}
      {data?.receive_nft_list?.map((item, index) => {
        return (
          <NFTBalanceChangeItem
            key={`${item.token_id}-${index}-receive`}
            prefix="+"
            item={item}
          />
        );
      })}
    </div>
  );
};
