import React, { Fragment, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PortfolioItemNft,
  PortfolioItemToken,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';

import { getCollectionDisplayName } from './nft';
import { formatLittleNumber, formatAmount, formatUsdValue } from '@/ui/utils';
import { HelperTooltip } from '../components/HelperTooltip';
import { ReactComponent as IconWarning } from 'ui/assets/search/RcIconDanger.svg';
import { TokensIcons } from '../components/TokenIcons';
import LabelWithIcon from '../components/LabelWithIcons';
import { DesktopTokenLabel } from '../../../TransactionsTabPane/DesktopTokenLabel';
import cx from 'clsx';

export function getTokenSymbol(token?: {
  optimized_symbol?: string | null;
  display_symbol?: string | null;
  symbol?: string | null;
}) {
  return (
    token?.optimized_symbol || token?.display_symbol || token?.symbol || ''
  );
}

export function getTokens(
  tokens: (PortfolioItemToken | undefined)[] = [],
  separator: string = ' + ',
  nfts?: PortfolioItemNft[]
) {
  const icon = (
    <TokensIcons
      width={24}
      nftIcons={nfts?.map((n) => n.collection?.logo_url)}
      icons={tokens.map((v) => v?.logo_url)}
    />
  );

  const _tokens = (
    <>
      {tokens
        .filter((token) => !!token)
        .map((token, i) => (
          <Fragment key={i}>
            {i ? separator : null}
            <DesktopTokenLabel
              token={token as TokenItem}
              canClickToken={!!token?.id && !!token?.chain}
              isNft={false}
              textClassName={cx(
                'text-r-neutral-title1 text-15 font-medium whitespace-nowrap overflow-ellipsis overflow-hidden',
                'no-underline',
                !!token?.id && !!token?.chain
                  ? 'cursor-pointer hover:text-r-blue-default hover:underline '
                  : ''
              )}
            />
          </Fragment>
        ))}
    </>
  );

  const _nfts = (
    <>
      {nfts?.map((n, i) => (
        <Fragment key={i}>
          {i ? separator : null}
          <span>{getCollectionDisplayName(n.collection)}</span>
        </Fragment>
      ))}
      {separator}
      {_tokens}
    </>
  );

  return (
    <LabelWithIcon
      labelClassName="text-[15px] text-r-neutral-title1 font-medium flex-1"
      label={nfts?.length ? _nfts : _tokens}
      icon={icon}
    />
  );
}

// 弃用，用专门的格式化函数formatAmount
export function TokensAmount({
  tokens = [],
  withPrice = false,
}: {
  tokens?: PortfolioItemToken[];
  withPrice?: boolean;
}) {
  return (
    <>
      {tokens.map((v, i) => {
        return (
          v && (
            <div
              key={v.id}
              className="flex text-[15px] text-r-neutral-title1 font-medium items-center"
              style={{ marginTop: i === 0 ? 0 : 4 }}
            >
              {`${formatAmount(v.amount)} `}
              <DesktopTokenLabel
                token={v}
                canClickToken={!!v?.id && !!v?.chain}
                isNft={false}
                textClassName={cx(
                  'text-r-neutral-title1 text-15 font-medium whitespace-nowrap overflow-ellipsis overflow-hidden',
                  'no-underline',
                  !!v?.id && !!v?.chain
                    ? 'cursor-pointer hover:text-r-blue-default hover:underline '
                    : ''
                )}
              />{' '}
              {v.price !== 0 && withPrice && (
                <span className="ml-6">{`(${formatUsdValue(
                  (v.price ?? 0) * v.amount
                )})`}</span>
              )}
              {!v.price && (
                <HelperTooltip title="No price available at the moment">
                  <IconWarning
                    width={14}
                    height={14}
                    style={{ marginLeft: 2 }}
                  />
                </HelperTooltip>
              )}
            </div>
          )
        );
      })}
    </>
  );
}

export function getUsd(tokens: PortfolioItemToken[] = [], precision = 0) {
  // 沒有价格
  if (tokens.every((v) => !v.price)) return '-';
  return `${formatLittleNumber(
    tokens
      .reduce((sum, curr) => {
        return (sum += (curr.price || 0) * curr.amount);
      }, 0)
      .toString(),
    precision
  )}`;
}
