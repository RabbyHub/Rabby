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

type DesktopTokenChangeProps = {
  data: TxDisplayItem | TxHistoryItem;
  canClickToken?: boolean;
  onClose?: () => void;
} & Pick<TxDisplayItem, 'tokenDict'>;

export const DesktopTokenChange = ({
  data: info,
  tokenDict,
  canClickToken = true,
  onClose,
}: DesktopTokenChangeProps) => {
  const tokens = tokenDict || {};
  const { t } = useTranslation();

  if (!info.sends?.length && !info.receives?.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {info.sends?.map((v) => {
        const tokenId = v.token_id;
        const tokenUUID = `${info.chain}_token:${tokenId}`;
        const token = tokens[tokenId] || tokens[tokenUUID];
        const isNft = v.token_id?.length === 32;
        const symbol = getTokenSymbol(token);
        const name = isNft
          ? token?.name ||
            (symbol ? `${symbol} ${token?.inner_id}` : t('global.unknownNFT'))
          : symbol;

        return (
          <div
            key={v.token_id}
            className="flex items-center gap-2"
            title={name}
          >
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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-13 text-r-neutral-body font-medium">-</span>
              <span className="text-13 text-r-neutral-body font-medium">
                {isNft ? v.amount : numberWithCommasIsLtOne(v.amount, 4)}
              </span>
              <DesktopTokenLabel
                isNft={isNft}
                token={token}
                onClose={onClose}
                textClassName="text-13 text-r-neutral-body  font-medium"
                canClickToken={isNft ? false : canClickToken}
              />
            </div>
          </div>
        );
      })}

      {info.receives?.map((v) => {
        const tokenId = v.token_id;
        const tokenUUID = `${info.chain}_token:${tokenId}`;
        const token = tokens[tokenId] || tokens[tokenUUID];
        const isNft = v.token_id?.length === 32;
        const symbol = getTokenSymbol(token);
        const name = isNft
          ? token?.name ||
            (symbol ? `${symbol} ${token?.inner_id}` : t('global.unknownNFT'))
          : symbol;

        return (
          <div
            key={v.token_id}
            className="flex items-center gap-2"
            title={name}
          >
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

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-13 text-r-green-default font-medium">
                +
              </span>
              <span className="text-13 text-r-green-default font-medium">
                {isNft ? v.amount : numberWithCommasIsLtOne(v.amount, 4)}
              </span>
              <DesktopTokenLabel
                isNft={isNft}
                token={token}
                onClose={onClose}
                textClassName="text-13 text-r-green-default font-medium"
                canClickToken={canClickToken}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
