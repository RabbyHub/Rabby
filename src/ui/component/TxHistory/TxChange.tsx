import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import React from 'react';
import IconUnknown from 'ui/assets/token-default.svg';
import { numberWithCommasIsLtOne } from 'ui/utils';
import { getTokenSymbol } from 'ui/utils/token';
import { TokenLabel } from './TokenLabel';
import { useTranslation } from 'react-i18next';
import { TxHistoryItemRow } from '@/db/schema/history';
import { DesktopTokenLabel } from '@/ui/views/DesktopProfile/components/TransactionsTabPane/DesktopTokenLabel';
import clsx from 'clsx';
import { UI_TYPE } from '@/constant/ui';

const TOKEN_ICON_CLASS =
  'token-icon shrink-0 w-14 h-14 mr-6 rounded-[50%] object-cover';

type TokenChangeProps = {
  data: TxHistoryItemRow;
  canClickToken?: boolean;
  onClose?: () => void;
};

export const TokenChange = ({
  data: info,
  canClickToken = true,
  onClose,
}: TokenChangeProps) => {
  const { t } = useTranslation();

  if (!info.sends?.length && !info.receives?.length) {
    return null;
  }

  return (
    <div className="ui token-change ml-auto flex flex-col gap-4 text-12 max-w-[200px] min-w-[130px]">
      {info.sends?.map((v) => {
        const token = v.token;
        const isNft = v.token_id?.length === 32;
        const symbol = getTokenSymbol(token);
        const name = isNft
          ? token?.name ||
            (symbol ? `${symbol} ${token?.inner_id}` : t('global.unknownNFT'))
          : symbol;

        return (
          <div
            className="token-change-item flex justify-end text-r-neutral-body"
            title={name}
            data-id={v.token_id}
            data-name={name}
            key={v.token_id}
          >
            {isNft ? (
              <NFTAvatar
                className={TOKEN_ICON_CLASS}
                thumbnail
                content={token?.content}
                type={token?.content_type}
              ></NFTAvatar>
            ) : (
              <img
                className={TOKEN_ICON_CLASS}
                src={token?.logo_url || IconUnknown}
                alt=""
              />
            )}
            <span
              style={{
                width: 8,
                display: 'inline-block',
                textAlign: 'center',
              }}
            >
              -
            </span>
            <span className="token-change-item-text truncate">
              {isNft ? v.amount : numberWithCommasIsLtOne(v.amount, 2)}
            </span>
            {UI_TYPE.isDesktop ? (
              <DesktopTokenLabel
                isNft={isNft}
                token={token}
                onClose={onClose}
                textClassName={clsx(isNft || !canClickToken ? '' : 'underline')}
                canClickToken={isNft ? false : canClickToken}
              />
            ) : (
              <TokenLabel
                isNft={isNft}
                token={token}
                canClickToken={isNft ? false : canClickToken}
                onClose={onClose}
              />
            )}
          </div>
        );
      })}
      {info.receives?.map((v) => {
        const token = v.token;
        const isNft = v.token_id?.length === 32;
        const symbol = getTokenSymbol(token);
        const name = isNft
          ? token?.name ||
            (symbol ? `${symbol} ${token?.inner_id}` : t('global.unknownNFT'))
          : symbol;

        return (
          <div
            data-id={v.token_id}
            data-name={name}
            className="token-change-item is-success flex justify-end text-r-green-default"
            title={name}
            key={v.token_id}
          >
            {isNft ? (
              <NFTAvatar
                className={TOKEN_ICON_CLASS}
                thumbnail
                content={token?.content}
                type={token?.content_type}
              ></NFTAvatar>
            ) : (
              <img
                className={TOKEN_ICON_CLASS}
                src={token?.logo_url || IconUnknown}
                alt=""
              />
            )}
            <span
              style={{
                width: 8,
                display: 'inline-block',
                textAlign: 'center',
              }}
            >
              +
            </span>
            <span className="token-change-item-text truncate">
              {isNft ? v.amount : numberWithCommasIsLtOne(v.amount, 2)}
            </span>
            {UI_TYPE.isDesktop ? (
              <DesktopTokenLabel
                isNft={isNft}
                token={token}
                onClose={onClose}
                textClassName={clsx(isNft || !canClickToken ? '' : 'underline')}
                canClickToken={isNft ? false : canClickToken}
              />
            ) : (
              <TokenLabel
                isNft={isNft}
                token={token}
                canClickToken={isNft ? false : canClickToken}
                onClose={onClose}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
