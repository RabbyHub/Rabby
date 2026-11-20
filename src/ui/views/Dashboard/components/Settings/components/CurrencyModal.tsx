import React, { useEffect, useMemo, useState } from 'react';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { PageHeader } from 'ui/component';
import IconCheck from 'ui/assets/check-2.svg';
import IconSearch from 'ui/assets/search.svg';
import { CurrencyItem } from '@/background/service/openapi';
import { useCurrency } from '@/ui/hooks/useCurrency';
import clsx from 'clsx';
import styles from './CurrencyModal.module.css';

export const CurrencyModal = ({
  visible,
  onFinish,
  onCancel,
}: {
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [keyword, setKeyword] = useState('');
  const {
    currency,
    currencyList,
    setCurrentCurrency,
    syncCurrencyList,
  } = useCurrency();

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  const sortedList = useMemo(() => {
    const topCodes = Array.from(
      new Set([currency.code, 'BTC', 'ETH', 'USD', 'EUR'])
    );

    const topList = topCodes.map((code) =>
      currencyList.find((item) => item.code === code)
    );

    const rest = currencyList
      .filter((item) => !topCodes.includes(item.code))
      .sort((a, b) => a.code.localeCompare(b.code));

    return [...topList, ...rest].filter(Boolean) as CurrencyItem[];
  }, [currency.code, currencyList]);

  const filteredList = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) {
      return sortedList;
    }

    return sortedList.filter((item) => {
      return (
        item.code.toLowerCase().includes(text) ||
        item.symbol.toLowerCase().includes(text)
      );
    });
  }, [keyword, sortedList]);

  const handleSelect = async (item: CurrencyItem) => {
    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);

    if (item.code !== currency.code) {
      setCurrentCurrency(item.code);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
    if (visible) {
      setKeyword('');
      syncCurrencyList();
    }
  }, [visible, syncCurrencyList]);

  return (
    <div
      className={clsx(
        styles.wrapper,
        visible && styles.visible,
        isVisible && styles.show
      )}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('page.dashboard.settings.settings.currency')}
      </PageHeader>
      <Input
        prefix={<img src={IconSearch} />}
        className="currency-search"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={t('page.dashboard.settings.settings.searchCurrency')}
      />
      <div className="auto-lock-option-list">
        {filteredList.map((item) => {
          return (
            <div
              className="auto-lock-option-list-item"
              key={item.code}
              onClick={() => {
                handleSelect(item);
              }}
            >
              <div className="currency-icon-wrapper">
                <img src={item.logo_url} alt="" className="currency-icon" />
              </div>
              {item.code} ({item.symbol})
              {currency.code === item.code && (
                <img
                  src={IconCheck}
                  alt=""
                  className="auto-lock-option-list-item-icon"
                />
              )}
            </div>
          );
        })}
        {!filteredList.length && (
          <div className="currency-empty">{t('page.dashboard.noData')}</div>
        )}
      </div>
    </div>
  );
};
