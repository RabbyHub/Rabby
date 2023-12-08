import { formatAmount } from '@/ui/utils';
import { NFTItem, PendingTxItem } from '@rabby-wallet/rabby-api/dist/types';
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import IconUnknownNFT from 'ui/assets/pending/icon-unknown-nft.svg';
import NFTAvatar from '../../../Dashboard/components/NFT/NFTAvatar';

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
  const uuid = `${item.chain || 'eth'}:${item.token_id}`;
  const token = tokenDict?.[uuid];
  const symbol = '';
  const name =
    token?.name ||
    (symbol ? `${symbol} ${token?.inner_id}` : t('global.unknownNFT'));
  return (
    <div className="flex items-center gap-[8px]">
      <NFTAvatar
        className="w-[18px] h-[18px]"
        thumbnail
        unknown={IconUnknownNFT}
        content={token?.content}
        type={token?.content_type}
      ></NFTAvatar>
      <div className="text-r-neutral-title-1 font-medium">
        {prefix} {formatAmount(item.amount, 0)} {name}
      </div>
    </div>
  );
};
