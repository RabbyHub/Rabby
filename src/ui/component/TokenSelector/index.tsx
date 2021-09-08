import React, { useEffect, useState } from 'react';
import { Modal, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import TokenWithChain from '../TokenWithChain';
import { TokenItem } from 'background/service/openapi';
import { splitNumberByStep, formatTokenAmount } from 'ui/utils/number';
import IconSearch from 'ui/assets/search.svg';
import './style.less';

interface TokenSelectorProps {
  visible: boolean;
  list: TokenItem[];
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
}: TokenSelectorProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'common' | 'all'>('common');
  const [displayList, setDisplayList] = useState<TokenItem[]>(list);
  const handleSort = (condition: 'common' | 'all') => {
    if (condition === 'common') {
      setDisplayList(
        list.sort((a, b) => {
          if (a.is_core && !b.is_core) {
            return 1;
          } else if (a.is_core && b.is_core) {
            return 0;
          } else if (!a.is_core && b.is_core) {
            return -1;
          }
          return 0;
        })
      );
    } else {
      setDisplayList(list);
    }
  };

  useDebounce(
    () => {
      onSearch(query);
    },
    300,
    [query]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  useEffect(() => {
    setDisplayList(list);
  }, [list]);

  return (
    <Modal
      className="token-selector"
      width="360px"
      title={t('Select a token')}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      centered
    >
      <div className="input-wrapper">
        <Input
          size="large"
          prefix={<img src={IconSearch} />}
          placeholder={t('Search name or paste address')}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
      </div>
      <ul className="token-list">
        <li className="token-list__header">
          <div>{t('Token')}</div>
          <div>{t('Price')}</div>
          <div>{t('Balance')}</div>
        </li>
        {displayList.map((token) => (
          <li className="token-list__item" key={`${token.chain}-${token.id}`}>
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
