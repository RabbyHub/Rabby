import React, { useEffect, useMemo, useState } from 'react';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { PageHeader } from 'ui/component';
import IconCheck from 'ui/assets/check-2.svg';
import IconSearch from 'ui/assets/search.svg';
import { CurrencyItem } from '@/background/service/openapi';
import { useCurrency } from '@/ui/hooks/useCurrency';
import styled from 'styled-components';

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
    const selected = currencyList.find((item) => item.code === currency.code);
    if (!selected) {
      return currencyList;
    }
    return [
      selected,
      ...currencyList.filter((item) => item.code !== selected.code),
    ];
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
    <Wrapper $show={isVisible} $visible={visible}>
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
              <img
                src={item.logo_url}
                alt=""
                className="w-20 h-20 rounded-full mr-8"
              />
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
    </Wrapper>
  );
};

const Wrapper = styled.div<{
  $show: boolean;
  $visible: boolean;
}>`
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
  background-color: var(--r-neutral-bg-1, #575b70);
  transform: ${({ $show }) => ($show ? 'translateX(0)' : 'translateX(100%)')};
  transition: transform 0.3s;
  padding: 20px 20px 0 20px;
  border-radius: 16px 16px 0 0;

  .page-header {
    padding-top: 0;
    margin-bottom: 28px;
  }

  .currency-search {
    padding: 14px 12px;
    margin-bottom: 12px;
    border: 1px solid var(--r-neutral-line, rgba(255, 255, 255, 0.12)) !important;
    border-radius: 8px;
    background-color: var(--r-neutral-card-1) !important;
    font-size: 13px;
    line-height: 13px;
    &:active,
    &:focus {
      border: 1px solid var(--r-blue-default, #4c65ff) !important;
    }

    .ant-input {
      color: var(--r-neutral-title-1, #f7fafc);
      border-radius: 0;
    }
  }

  .auto-lock-option-list {
    overflow: auto;
    max-height: calc(100% - 48px);
  }

  .auto-lock-option-list-item {
    display: flex;
    height: 52px;
    padding: 17px 15px;
    border-radius: 6px;
    background: var(--r-neutral-card-2, rgba(255, 255, 255, 0.06));
    align-items: center;
    margin-bottom: 12px;
    color: var(--r-neutral-title-1, #f7fafc);
    font-size: 14px;
    font-weight: 500;
    line-height: 16px;
    border: 1px solid transparent;
    cursor: pointer;

    &:hover {
      background-color: rgba(134, 151, 255, 0.2);
      border: 1px solid var(--r-blue-default, #7084ff);
    }
  }

  .auto-lock-option-list-item-icon {
    margin-left: auto;
    width: 16px;
    height: 16px;
  }

  .currency-empty {
    text-align: center;
    color: var(--r-neutral-foot, #6a7587);
    font-size: 12px;
    line-height: 16px;
    padding: 16px 0;
  }
`;
