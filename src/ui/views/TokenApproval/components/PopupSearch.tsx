import { TokenApproval } from '@/background/service/openapi';
import { Input } from 'antd';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconSearch from 'ui/assets/search.svg';
import { Empty, Popup } from 'ui/component';
import ApprovalCard from './ApprovalCard';

interface PopupSearchProps {
  visible: boolean;
  data: TokenApproval[];
  onClose?(): void;
}

const PopupSearch = ({ data, visible, onClose }: PopupSearchProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState<string>('');
  const inputRef = useRef<Input>(null);

  const filterList = useMemo(() => {
    if (!query) {
      // return data;
      return [];
    }
    return data
      .map((item) => {
        if (item.symbol.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
          return item;
        }

        const spenders = item.spenders.filter((spender) => {
          return (
            (spender.protocol &&
              spender.protocol?.name
                ?.toLowerCase()
                .indexOf(query.toLowerCase()) !== -1) ||
            spender.id === query
          );
        });

        if (spenders.length === item.spenders.length && spenders.length > 0) {
          return item;
        }
        if (spenders.length > 0) {
          return {
            ...item,
            sum_exposure_usd: Math.min(
              spenders.reduce((m, n) => n.exposure_usd + m, 0),
              item.sum_exposure_usd
            ),
            spenders,
          };
        }

        return null;
      })
      .filter((item) => item != null)
      .sort((a) =>
        a?.symbol.toLowerCase() === query.toLowerCase() ? -1 : 1
      ) as TokenApproval[];
  }, [data, query]);

  const handleInputChange = useMemo(
    () =>
      debounce((e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
      }, 500),
    [setQuery]
  );
  useEffect(() => {
    if (!visible) {
      setQuery('');
    } else {
      setTimeout(() => {
        inputRef.current?.focus();
      });
    }
  }, [visible]);
  return (
    <Popup
      visible={visible}
      onClose={onClose}
      title="Search"
      height={580}
      closable
      className="token-approval-popup-search"
    >
      {visible && (
        <>
          <header>
            <Input
              size="large"
              prefix={<img src={IconSearch} />}
              placeholder={t('Search tokens/protocols/addresses')}
              onChange={handleInputChange}
              autoFocus
              ref={inputRef}
            />
          </header>
          {filterList.map((item) => (
            <ApprovalCard data={item} key={item.id}></ApprovalCard>
          ))}
          {filterList.length <= 0 && (
            <Empty className="pt-[80px]">{t('No Results')}</Empty>
          )}
        </>
      )}
    </Popup>
  );
};

export default PopupSearch;
