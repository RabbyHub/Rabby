import React, { useEffect, useMemo, useState } from 'react';
import { Input, Drawer, Skeleton } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import TokenWithChain from '../TokenWithChain';
import { TokenItem } from 'background/service/openapi';
import { splitNumberByStep, formatTokenAmount } from 'ui/utils/number';
import { getTokenSymbol } from 'ui/utils/token';
import IconSearch from 'ui/assets/search.svg';
import './style.less';
import BigNumber from 'bignumber.js';
import stats from '@/stats';
import MatchImage from 'ui/assets/match.svg';
import { CHAINS_LIST } from '@debank/common';

export const isSwapTokenType = (s: string) =>
  ['swapFrom', 'swapTo'].includes(s);

export interface TokenSelectorProps {
  visible: boolean;
  list: TokenItem[];
  isLoading?: boolean;
  onConfirm(item: TokenItem): void;
  onCancel(): void;
  onSearch(q: string);
  type?: 'default' | 'swapFrom' | 'swapTo';
  placeholder?: string;
  chainId: string;
}

const TokenSelector = ({
  visible,
  list,
  onConfirm,
  onCancel,
  onSearch,
  isLoading = false,
  type = 'default',
  placeholder,
  chainId,
}: TokenSelectorProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isInputActive, setIsInputActive] = useState(false);

  useDebounce(
    () => {
      onSearch(query);
    },
    150,
    [query]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  const displayList = useMemo(() => list || [], [list]);

  const handleInputFocus = () => {
    setIsInputActive(true);
  };

  const handleInputBlur = () => {
    setIsInputActive(false);
  };

  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const isEmpty = list.length <= 0;

  const isSwapType = isSwapTokenType(type);

  const isSearchAddr = useMemo(() => {
    const v = query?.trim() || '';
    return v.length === 42 && v.toLowerCase().startsWith('0x');
  }, [query]);

  const NoDataUI = useMemo(
    () =>
      isLoading ? (
        <div>
          {Array(isSwapType ? 8 : 10)
            .fill(1)
            .map((_, i) =>
              isSwapType ? <SwapLoading key={i} /> : <DefaultLoading key={i} />
            )}
        </div>
      ) : (
        <div className="no-token w-full">
          <img
            className={
              !query || isSearchAddr
                ? 'w-[100px] h-[100px]'
                : 'w-[52px] h-[52px]'
            }
            src={!query || isSearchAddr ? '/images/nodata-tx.png' : MatchImage}
            alt="no site"
          />

          {!query || isSearchAddr ? (
            <p className="text-gray-content text-14 mt-12 text-center mb-0">
              {t('No Tokens')}
            </p>
          ) : (
            <>
              <p className="text-gray-content text-14 mt-12 text-center mb-0">
                No Match
              </p>
              <p className="text-gray-content text-14 mt-0 text-center">
                Try to search contract address on{' '}
                {CHAINS_LIST.find((e) => e.serverId === chainId)?.name ||
                  'chain'}
              </p>
            </>
          )}
        </div>
      ),
    [isLoading, isSwapType, t, isSearchAddr, chainId]
  );

  useEffect(() => {
    if (query && isSwapType && displayList.length === 0) {
      stats.report('swapTokenSearchFailure', {
        chainId,
        searchType: type === 'swapFrom' ? 'fromToken' : 'toToken',
        keyword: query,
      });
    }
  }, [type, query, isSwapType, displayList, query, chainId]);

  return (
    <Drawer
      className="token-selector"
      height="580px"
      placement="bottom"
      visible={visible}
      onClose={onCancel}
    >
      <div className="header">{t('Select a token')}</div>
      <div className="input-wrapper">
        <Input
          className={clsx({ active: isInputActive })}
          size="large"
          prefix={<img src={IconSearch} />}
          placeholder={placeholder ?? t('Search by Name / Address')}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          autoFocus
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
      </div>
      <ul className={clsx('token-list', { empty: isEmpty })}>
        <li className="token-list__header">
          <div>{t('Token')}</div>
          {!isSwapType && <div>{t('Price')}</div>}
          <div>
            {isSwapType ? t('Balance') + ' / ' + t('Value') : t('Balance')}
          </div>
        </li>
        {isEmpty
          ? NoDataUI
          : displayList.map((token) => (
              <li
                className={clsx(
                  'token-list__item h-[52px]',
                  isSwapType && 'justify-between'
                )}
                key={`${token.chain}-${token.id}`}
                onClick={() => onConfirm(token)}
                title={getTokenSymbol(token)}
              >
                <div>
                  <TokenWithChain
                    token={token}
                    width="24px"
                    height="24px"
                    hideConer
                    // hideChainIcon={isSwapType}
                  />
                  <div className="flex flex-col text-left">
                    <span className="symbol">{getTokenSymbol(token)}</span>
                    <span
                      className={clsx(
                        'symbol text-12 text-gray-content',
                        !isSwapType && 'hidden'
                      )}
                    >
                      ${splitNumberByStep((token.price || 0).toFixed(2))}
                    </span>
                  </div>
                </div>

                <div className={clsx(isSwapType && 'hidden')}>
                  ${splitNumberByStep((token.price || 0).toFixed(2))}
                </div>

                <div className="flex flex-col text-right items-end">
                  <div
                    className="max-w-full font-medium text-13 text-gray-title truncate ml-[8px]"
                    title={formatTokenAmount(token.amount)}
                  >
                    {isSwapType
                      ? token.amount !== 0 && token.amount < 0.0001
                        ? '< 0.0001'
                        : formatTokenAmount(token.amount)
                      : formatTokenAmount(token.amount)}
                  </div>
                  <div
                    title={splitNumberByStep(
                      new BigNumber(token.price || 0)
                        .times(token.amount)
                        .toFixed(2)
                    )}
                    className={clsx(
                      'max-w-full text-12 text-gray-content',
                      !isSwapType && 'hidden',
                      'truncate'
                    )}
                  >
                    $
                    {splitNumberByStep(
                      new BigNumber(token.price || 0)
                        .times(token.amount)
                        .toFixed(2)
                    )}
                  </div>
                </div>
              </li>
            ))}
      </ul>
    </Drawer>
  );
};

const DefaultLoading = () => (
  <div className="flex justify-between mt-[16px] pl-[20px] pr-[17px]">
    <Skeleton.Input
      active
      style={{
        width: 73,
        height: 23,
      }}
    />
    <Skeleton.Input
      active
      style={{
        width: 76,
        height: 23,
      }}
    />
    <Skeleton.Input
      active
      style={{
        width: 92,
        height: 23,
      }}
    />
  </div>
);

const SwapLoading = () => (
  <div className="mt-[12px] mb-[20px] pl-[20px] pr-[17px]">
    <div className="flex justify-between mb-[2px]">
      <Skeleton.Input
        active
        style={{
          width: 139,
          height: 15,
        }}
      />
      <Skeleton.Input
        active
        style={{
          width: 90,
          height: 15,
        }}
      />
    </div>
    <div className="flex justify-between">
      <Skeleton.Input
        active
        style={{
          width: 59,
          height: 14,
        }}
      />
      <Skeleton.Input
        active
        style={{
          width: 59,
          height: 14,
        }}
      />
    </div>
  </div>
);

export default TokenSelector;
