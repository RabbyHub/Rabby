import React, { useEffect, useState } from 'react';
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

interface TokenSelectorProps {
  visible: boolean;
  list: TokenItem[];
  isLoading?: boolean;
  onConfirm(item: TokenItem): void;
  onCancel(): void;
  onSearch(q: string);
}

const TokenSelector = ({
  visible,
  list,
  onConfirm,
  onCancel,
  onSearch,
  isLoading = false,
}: TokenSelectorProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [displayList, setDisplayList] = useState<TokenItem[]>(list);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
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

  const handleInputFocus = () => {
    setIsInputActive(true);
  };

  const handleInputBlur = () => {
    setIsInputActive(false);
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
      setDisplayList([]);
    }
  }, [visible]);

  const isEmpty = !query && list.length <= 0;

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
          placeholder={t('Search name or paste address')}
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
                  <TokenWithChain
                    token={token}
                    width="24px"
                    height="24px"
                    hideConer
                  />
                  <span className="symbol">{token.symbol}</span>
                </div>
                <div>${splitNumberByStep((token.price || 0).toFixed(2))}</div>
                <div>{formatTokenAmount(token.amount)}</div>
              </li>
            ))}
      </ul>
    </Drawer>
  );
};

export default TokenSelector;
