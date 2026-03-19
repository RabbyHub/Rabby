import React from 'react';
import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import IconUnknown from 'ui/assets/token-default.svg';
import { numberWithCommasIsLtOne } from 'ui/utils';
import { getTokenSymbol } from 'ui/utils/token';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { TokenLabel } from '@/ui/component/TxHistory/TokenLabel';
import { DesktopTokenLabel } from './DesktopTokenLabel';
import { TxHistoryItemRow } from '@/db/schema/history';

type DesktopTokenChangeProps = {
  data: TxHistoryItemRow;
  canClickToken?: boolean;
  onClose?: () => void;
};

export const DesktopTokenChange = ({
  data: info,
  canClickToken = true,
  onClose,
}: DesktopTokenChangeProps) => {
  const { t } = useTranslation();

  if (!info.sends?.length && !info.receives?.length) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-[6px]">
      {info.sends?.map((v) => {
        const tokenId = v.id;
        const tokenUUID = `${info.chain}_token:${tokenId}`;
        const token = v;
        const isNft = v.id?.length === 32;
        const symbol = getTokenSymbol(token);
        const name = isNft
          ? token?.name ||
            (symbol ? `${symbol} ${token?.inner_id}` : t('global.unknownNFT'))
          : symbol;

        return (
          <div key={v.id} className="flex items-center gap-[6px]" title={name}>
            {/* Token Icon */}
            {isNft ? (
              <NFTAvatar
                className="w-16 h-16 rounded-full"
                thumbnail
                content={token?.content}
                type={token?.content_type}
              />
            ) : (
              <img
                className="w-16 h-16 rounded-full"
                src={token?.logo_url || IconUnknown}
                alt={symbol || 'token'}
              />
            )}

            {/* Amount and Symbol */}
            <div className="flex items-center gap-[4px] flex-1 min-w-0">
              <span className="text-[14px] leading-[17px] text-r-neutral-body">
                -
              </span>
              <span className="text-[14px] leading-[17px] text-r-neutral-body">
                {isNft ? v.amount : numberWithCommasIsLtOne(v.amount, 4)}
              </span>
              <DesktopTokenLabel
                isNft={isNft}
                token={token}
                onClose={onClose}
                textClassName="text-[14px] leading-[17px] text-r-neutral-body"
                canClickToken={isNft ? false : canClickToken}
              />
            </div>
          </div>
        );
      })}

      {info.receives?.map((v) => {
        const tokenId = v;
        const token = v;
        const isNft = v.id?.length === 32;
        const symbol = getTokenSymbol(token);
        const name = isNft
          ? token?.name ||
            (symbol ? `${symbol} ${token?.inner_id}` : t('global.unknownNFT'))
          : symbol;

        return (
          <div key={v.id} className="flex items-center gap-[6px]" title={name}>
            {isNft ? (
              <NFTAvatar
                className="w-16 h-16 rounded-full"
                thumbnail
                content={token?.content}
                type={token?.content_type}
              />
            ) : (
              <img
                className="w-16 h-16 rounded-full"
                src={token?.logo_url || IconUnknown}
                alt={symbol || 'token'}
              />
            )}

            <div className="flex items-center gap-[4px] flex-1 min-w-0">
              <span className="text-[14px] leading-[17px] text-r-green-default">
                +
              </span>
              <span className="text-[14px] leading-[17px] text-r-green-default">
                {isNft ? v.amount : numberWithCommasIsLtOne(v.amount, 4)}
              </span>
              <DesktopTokenLabel
                isNft={isNft}
                token={token}
                onClose={onClose}
                textClassName="text-[14px] leading-[17px] text-r-green-default"
                canClickToken={canClickToken}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
