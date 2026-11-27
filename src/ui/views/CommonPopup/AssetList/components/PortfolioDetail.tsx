import React, { useMemo } from 'react';
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

const AssetAvatar = ({ token }: { token: TokenItem }) => {
  return (
    <img
      className={clsx(
        'w-24 h-24',
        token.isToken ? 'rounded-[100%]' : 'is-nft rounded-[4px]'
      )}
      src={token._logo || IconUnknown}
    />
  );
};

const rowCellClassName =
  'td w-[120px] text-[13px] leading-[15px] text-r-neutral-title-1 text-left last:flex-1 last:text-right';

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
  }, [nfts, t]);

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
  }, [fraction, t]);

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
    <div>
      <div className="header flex mt-16 px-4">
        {headers.map((h) => {
          return (
            <div
              className="td w-[120px] mb-12 text-12 text-r-neutral-foot text-left last:flex-1 last:text-right"
              key={h}
            >
              {h}
            </div>
          );
        })}
      </div>
      {list.map((l) => {
        return (
          <div className="row flex mb-16 px-4 last:mb-0" key={l.id}>
            <div className={clsx(rowCellClassName, 'flex items-center pr-4')}>
              <AssetAvatar token={l} />
              <span className="ml-8 overflow-hidden text-ellipsis whitespace-nowrap">
                {l._symbol}
              </span>
            </div>
            <div className={clsx(rowCellClassName, 'flex items-center')}>
              {l._amount}
            </div>
            <div
              className={clsx(
                rowCellClassName,
                'flex items-center justify-end relative'
              )}
            >
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
    </div>
  ) : null;
};

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
    <div
      className={clsx(
        'flex flex-wrap gap-y-8 p-12 -mx-10 w-[calc(100%_+_20px)]',
        'bg-[linear-gradient(90deg,var(--r-blue-light-1,#eef1ff)_0%,rgba(134,151,255,0)_100%)]'
      )}
    >
      {list.map((s) => (
        <div key={s.label} className="item flex w-1/2 text-12">
          <span className="label text-r-neutral-body">{s.label}:</span>
          <span className="content ml-4 text-r-neutral-title-1">
            {s.content}
          </span>
        </div>
      ))}
    </div>
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
