import React, { useEffect, useMemo, useState } from 'react';
import { Input, Drawer } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import TokenWithChain from '../TokenWithChain';
import { TokenItem } from 'background/service/openapi';
import { splitNumberByStep, formatTokenAmount } from 'ui/utils/number';
import IconSearch from 'ui/assets/search.svg';
import { SvgIconLoading } from 'ui/assets';
import './style.less';
import BigNumber from 'bignumber.js';
import Empty from '../Empty';
import stats from '@/stats';

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

  const isEmpty = !query && list.length <= 0;

  const isSwapType = isSwapTokenType(type);


  const NoDataUI = (
    <div className="no-token">
      {isLoading ? (
        <SvgIconLoading fill="#707280" className="icon icon-loading" />
      ) : (
        <img
          className="no-data-image"
          src="/images/nodata-tx.png"
          alt="no site"
        />
      )}
      <p className="text-gray-content text-14 mt-12 text-center mb-0">
        {isLoading ? t('Loading Tokens') : t('No Tokens')}
      </p>
    </div>
  );

  useEffect(() => {
    if (query && isSwapType && displayList.length === 0) {
      stats.report('swapTokenSearchFailure', {
        chainId: displayList[0].chain,
        searchType: type === 'swapFrom' ? 'fromToken' : 'toToken',
        keyword: query,
      });
    }
  }, [type, query, isSwapType, displayList]);

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
          placeholder={placeholder ?? t('Search name or paste address')}
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
                  'token-list__item',
                  isSwapType && 'justify-between'
                )}
                key={`${token.chain}-${token.id}`}
                onClick={() => onConfirm(token)}
              >
                <div>
                  <TokenWithChain
                    token={token}
                    width="24px"
                    height="24px"
                    hideConer
                    hideChainIcon={isSwapType}
                  />
                  <div className="flex flex-col text-left">
                    <span className="symbol">{token.symbol}</span>
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

                <div className="flex flex-col text-right">
                  <div className="font-medium text-13 text-gray-title">
                    {formatTokenAmount(token.amount)}
                  </div>
                  <div
                    className={clsx(
                      'text-12 text-gray-content',
                      !isSwapType && 'hidden'
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
        <Empty
          className={clsx(
            'pt-[80px]',
            (!isSwapType || isLoading || isEmpty || displayList.length > 0) &&
              'hidden'
          )}
        >
          <div className="text-14 text-gray-subTitle mb-12">
            {t('No Results')}
          </div>
          <p className="text-13 max-w-[283px] mx-auto text-center  text-gray-content ">
            Only tokens listed in Rabby by default are supported for swap
          </p>
        </Empty>
      </ul>
    </Drawer>
  );
};

export default TokenSelector;
