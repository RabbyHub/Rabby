import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { PortfolioItemNft } from '@rabby-wallet/rabby-api/dist/types';

import { getCollectionDisplayName } from './nft';
import { formatLittleNumber, formatNumber, formatUsdValue } from '@/ui/utils';
import { Tokens } from '../components/value';

import { HelperTooltip } from '../components/HelperTooltip';
import { ReactComponent as IconWarning } from 'ui/assets/search/RcIconDanger.svg';
import { TokensIcons } from '../components/TokenIcons';
import LabelWithIcon from '../components/LabelWithIcons';

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
  tokens: (Tokens | undefined)[] = [],
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
        .filter((token): token is Tokens => !!token)
        .map((token, i) => (
          <Fragment key={i}>
            {i ? separator : null}
            <span>{getTokenSymbol(token)}</span>
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
  tokens?: Tokens[];
  withPrice?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      {tokens.map((v, i) => {
        return (
          v && (
            <div
              key={v.id}
              className="flex text-[15px] text-r-neutral-title1 font-medium"
              style={{ marginTop: i === 0 ? 0 : 4 }}
            >
              {`${formatNumber(v.amount)} `}
              <span>{getTokenSymbol(v)}</span>{' '}
              {v.price !== 0 &&
                withPrice &&
                `(${formatUsdValue((v.price ?? 0) * v.amount)})`}
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

export function getUsd(tokens: Tokens[] = [], precision = 0) {
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
