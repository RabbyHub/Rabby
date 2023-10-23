import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import React from 'react';
import IconUnknown from 'ui/assets/token-default.svg';
import { numberWithCommasIsLtOne } from 'ui/utils';
import { getTokenSymbol } from 'ui/utils/token';
import { TokenLabel } from './TokenLabel';
import { useTranslation } from 'react-i18next';

type TokenChangeProps = {
  data: TxDisplayItem | TxHistoryItem;
  canClickToken?: boolean;
  onClose?: () => void;
} & Pick<TxDisplayItem, 'tokenDict'>;

export const TokenChange = ({
  data: info,
  tokenDict,
  canClickToken = true,
  onClose,
}: TokenChangeProps) => {
  const tokens = tokenDict || {};
  const { t } = useTranslation();

  if (!info.sends?.length && !info.receives?.length) {
    return null;
  }

  return (
    <div className="ui token-change">
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
            className="token-change-item"
            title={name}
            data-id={v.token_id}
            data-name={name}
            key={v.token_id}
          >
            {isNft ? (
              <NFTAvatar
                className="token-icon"
                thumbnail
                content={token?.content}
                type={token?.content_type}
              ></NFTAvatar>
            ) : (
              <img
                className="token-icon"
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
            <span className="token-change-item-text">
              {isNft ? v.amount : numberWithCommasIsLtOne(v.amount, 2)}
            </span>
            <TokenLabel
              isNft={isNft}
              token={token}
              canClickToken={isNft ? false : canClickToken}
              onClose={onClose}
            />
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
            data-id={v.token_id}
            data-name={name}
            className="token-change-item is-success"
            title={name}
            key={v.token_id}
          >
            {isNft ? (
              <NFTAvatar
                className="token-icon"
                thumbnail
                content={token?.content}
                type={token?.content_type}
              ></NFTAvatar>
            ) : (
              <img
                className="token-icon"
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
            <span className="token-change-item-text">
              {isNft ? v.amount : numberWithCommasIsLtOne(v.amount, 2)}
            </span>
            <TokenLabel
              isNft={isNft}
              token={token}
              canClickToken={canClickToken}
              onClose={onClose}
            />
          </div>
        );
      })}
    </div>
  );
};
