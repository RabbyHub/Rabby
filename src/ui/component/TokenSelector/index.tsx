import React, { useEffect, useState } from 'react';
import { Modal, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import TokenWithChain from '../TokenWithChain';
import { TokenItem } from 'background/service/openapi';
import { splitNumberByStep, formatTokenAmount } from 'ui/utils/number';
import IconSearch from 'ui/assets/search.svg';
import IconLoading from 'ui/assets/loading-big.svg';
import './style.less';
import clsx from 'clsx';

interface TokenSelectorProps {
  visible: boolean;
  list: TokenItem[];
  isLoading?: boolean;
  onConfirm(item: TokenItem): void;
  onCancel(): void;
  onSearch(q: string);
  onSort(condition: string);
}

const TokenSelector = ({
  visible,
  list,
  onConfirm,
  onCancel,
  onSearch,
  onSort,
  isLoading = false,
}: TokenSelectorProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'common' | 'all'>('common');
  const [displayList, setDisplayList] = useState<TokenItem[]>(list);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const handleSort = (condition: 'common' | 'all') => {
    setSortBy(condition);
    onSort(condition);
  };

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

  const setTokensByStep = () => {
    if (displayList.length < list.length) {
      const tmId = window.setTimeout(
        () => {
          const thisStep = list.slice(
            displayList.length,
            displayList.length + 100 > list.length
              ? list.length
              : displayList.length + 100
          );
          setDisplayList([...displayList, ...thisStep]);
        },
        displayList.length <= 0 ? 0 : 500
      );
      setTimeoutId(tmId);
    }
  };

  useEffect(() => {
    setDisplayList([]);
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [list]);

  useEffect(() => {
    if (visible) {
      setTokensByStep();
    }
  }, [displayList, visible]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      handleSort('common');
      setDisplayList([]);
    }
  }, [visible]);

  const isEmpty = !query && list.length <= 0;

  const NoDataUI = (
    <div className="no-token">
      {isLoading ? (
        <img className="icon icon-loading" src={IconLoading} />
      ) : (
        <img
          className="no-data-image"
          src="/images/nodata-tx.png"
          alt="no site"
        />
      )}
      <p className="text-gray-content text-14 mt-12 text-center">
        {isLoading ? t('Loading Tokens') : t('No Tokens')}
      </p>
    </div>
  );

  return (
    <Modal
      className="token-selector"
      width="360px"
      title={t('Select a token')}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      centered
      destroyOnClose
    >
      <div className="input-wrapper">
        <Input
          size="large"
          prefix={<img src={IconSearch} />}
          placeholder={t('Search name or paste address')}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          autoFocus
        />
      </div>
      {!query && (
        <div className="token-sort">
          <span
            className={clsx({ active: sortBy === 'common' })}
            onClick={() => handleSort('common')}
          >
            {t('Common')}
          </span>{' '}
          /{' '}
          <span
            className={clsx({ active: sortBy === 'all' })}
            onClick={() => handleSort('all')}
          >
            {t('All')}
          </span>
        </div>
      )}
      <ul className={clsx('token-list', { empty: isEmpty })}>
        <li className="token-list__header">
          <div>{t('Token')}</div>
          <div>{t('Price')}</div>
          <div>{t('Balance')}</div>
        </li>
        {isEmpty
          ? NoDataUI
          : displayList.map((token) => (
              <li
                className="token-list__item"
                key={`${token.chain}-${token.id}`}
                onClick={() => onConfirm(token)}
              >
                <div>
                  <TokenWithChain token={token} width="24px" height="24px" />
                  <span className="symbol">{token.symbol}</span>
                </div>
                <div>${splitNumberByStep((token.price || 0).toFixed(2))}</div>
                <div>{formatTokenAmount(token.amount)}</div>
              </li>
            ))}
      </ul>
    </Modal>
  );
};

export default TokenSelector;
