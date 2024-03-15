import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
  NftCollection,
  PortfolioItemNft,
  PortfolioItemToken,
} from '@rabby-wallet/rabby-api/dist/types';
import groupBy from 'lodash/groupBy';
import clsx from 'clsx';
import { getTokenSymbol } from 'ui/utils/token';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import IconUnknown from 'ui/assets/token-default.svg';
import IconTokenTip from 'ui/assets/dashboard/portfolio/token-tip.svg';
import { useTranslation } from 'react-i18next';

type TokenItem = {
  id: string;
  _logo: string;
  amount: number;
  _symbol: string;
  _amount: string;
  _netWorth: number;
  _netWorthStr: string;
  isToken?: boolean;
  tip?: string;
};

const AssetAvatarWrapper = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 100%;
  &.is-nft {
    border-radius: 4px;
  }
`;

const AssetAvatar = ({ token }: { token: TokenItem }) => {
  return (
    <AssetAvatarWrapper
      className={clsx({ 'is-nft': !token.isToken })}
      src={token._logo || IconUnknown}
    />
  );
};

const TokenListWrapper = styled.div`
  .header {
    display: flex;
    margin-top: 16px;
    .td {
      font-size: 12px;
      line-height: 14px;
      color: var(--r-neutral-foot, #6a7587);
      text-align: left;
      width: 120px;
      margin-bottom: 12px;
      &:nth-last-child(1) {
        flex: 1;
        text-align: right;
      }
    }
  }
  .row {
    display: flex;
    margin-bottom: 16px;
    .td {
      width: 120px;
      font-size: 13px;
      line-height: 15px;
      color: var(--r-neutral-title-1, #192945);
      text-align: left;
      &:nth-last-child(1) {
        text-align: right;
        flex: 1;
      }
    }
    &:nth-last-child(1) {
      margin-bottom: 0;
    }
  }
`;

export const TokenList = ({
  name,
  tokens,
  nfts,
  fraction,
}: {
  name: string;
  tokens?: PortfolioItemToken[];
  nfts?: PortfolioItemNft[];
  fraction?: {
    collection: NftCollection;
    value: number;
    shareToken: PortfolioItemToken;
  };
}) => {
  const { t } = useTranslation();
  const headers = [
    name,
    t('page.dashboard.assets.amount'),
    t('page.dashboard.assets.usdValue'),
  ];

  const _tokens: TokenItem[] = useMemo(() => {
    return (tokens ?? [])
      .map((x) => {
        const _netWorth = x.amount * x.price || 0;

        return {
          id: x.id,
          amount: x.amount,
          _logo: x.logo_url,
          _symbol: getTokenSymbol(x),
          _amount: formatAmount(x.amount),
          _netWorth: _netWorth,
          _netWorthStr: formatUsdValue(_netWorth),
          isToken: true,
        };
      })
      .sort((m, n) => n._netWorth - m._netWorth);
  }, [tokens]);

  const _nfts: TokenItem[] = useMemo(() => {
    return polyNfts(nfts ?? []).map((n) => {
      const floorToken = n.collection.floor_price_token;
      const _netWorth = floorToken
        ? floorToken.amount * floorToken.price * n.amount
        : 0;
      const _symbol = getCollectionDisplayName(n.collection);

      return {
        id: n.id,
        _logo: n.collection.logo_url,
        _symbol,
        amount: n.amount,
        _amount: `${_symbol} x${n.amount}`,
        _netWorth,
        _netWorthStr: _netWorth ? formatUsdValue(_netWorth) : '-',
        tip: _netWorth ? t('page.dashboard.assets.portfolio.nftTips') : '',
      };
    });
  }, [nfts]);

  const _fraction: TokenItem | null = useMemo(() => {
    return fraction
      ? {
          id: `fraction${
            fraction.collection.id + fraction.collection.chain_id
          }`,
          _logo: fraction.collection.logo_url,
          _symbol: getCollectionDisplayName(fraction.collection),
          amount: fraction.shareToken.amount,
          _amount: `${formatAmount(
            fraction.shareToken.amount
          )} ${getTokenSymbol(fraction.shareToken)}`,
          _netWorth: fraction.value,
          _netWorthStr: fraction.value
            ? formatUsdValue(fraction.value ?? 0)
            : '-',
          tip: fraction.value
            ? t('page.dashboard.assets.portfolio.fractionTips')
            : '',
        }
      : null;
  }, [fraction]);

  const list = useMemo(() => {
    const result = [_fraction, ..._nfts]
      .filter((x): x is TokenItem => !!x)
      .sort((m, n) => {
        return !m._netWorth && !n._netWorth
          ? (n.amount || 0) - (m.amount || 0)
          : (n._netWorth || 0) - (m._netWorth || 0);
      });

    result.push(..._tokens);

    return result;
  }, [_fraction, _nfts, _tokens]);

  return list.length ? (
    <TokenListWrapper>
      <div className="header">
        {headers.map((h) => {
          return (
            <div className="td" key={h}>
              {h}
            </div>
          );
        })}
      </div>
      {list.map((l) => {
        return (
          <div className="row" key={l.id}>
            <div className="td flex items-center pr-4">
              <AssetAvatar token={l} />
              <span className="ml-8 overflow-hidden overflow-ellipsis whitespace-nowrap">
                {l._symbol}
              </span>
            </div>
            <div className="td flex items-center">{l._amount}</div>
            <div className="td flex items-center justify-end relative">
              <span>{l._netWorthStr}</span>
              {l.tip ? (
                <TooltipWithMagnetArrow
                  overlayClassName="rectangle w-[max-content]"
                  title={l.tip}
                >
                  <img src={IconTokenTip} className="w-12 ml-4" />
                </TooltipWithMagnetArrow>
              ) : null}
            </div>
          </div>
        );
      })}
    </TokenListWrapper>
  ) : null;
};

const SupplementsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 12px;
  margin-left: -10px;
  margin-right: -10px;
  width: calc(100% + 20px);
  background: linear-gradient(
    90deg,
    var(--r-blue-light-1, #eef1ff) 0%,
    rgba(134, 151, 255, 0) 100%
  );
  row-gap: 8px;
  .item {
    width: 50%;
    font-size: 12px;
    line-height: 14px;
    .label {
      color: var(--r-neutral-body, #babec5);
    }
    .content {
      color: var(--r-neutral-title-1, #192945);
      margin-left: 4px;
    }
  }
`;

type SupplementType = {
  label: string;
  content: React.ReactNode;
};

type SupplementsProps = {
  data?: Array<SupplementType | undefined | false>;
};

export const Supplements = ({ data }: SupplementsProps) => {
  const list = useMemo(() => data?.filter((x): x is SupplementType => !!x), [
    data,
  ]);

  return list?.length ? (
    <SupplementsWrapper>
      {list.map((s) => (
        <div key={s.label} className="item flex">
          <span className="label">{s.label}:</span>
          <span className="content">{s.content}</span>
        </div>
      ))}
    </SupplementsWrapper>
  ) : null;
};

export const polyNfts = (nfts: PortfolioItemNft[]) => {
  const poly = groupBy(nfts, (n) => n.collection.id + n.collection.chain_id);
  return Object.values(poly).map((arr) => {
    const amount = arr.reduce((sum, n) => {
      sum += n.amount;
      return sum;
    }, 0);
    return { ...arr[0], amount };
  });
};

export const getCollectionDisplayName = (c?: NftCollection) =>
  c ? c.symbol || c.name : '';
