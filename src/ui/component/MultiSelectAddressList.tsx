import React, { useEffect, useRef } from 'react';
import { FixedSizeList } from 'react-window';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { FieldCheckbox } from 'ui/component';
import AddressItem from 'ui/component/AddressList/AddressItem';
import { useSelectOption } from 'ui/utils';
import { BRAND_ALIAN_TYPE_TEXT } from 'consts';
import './index.less';
import clsx from 'clsx';
interface MultiSelectAddressListArgs {
  accounts: Array<{
    address: string;
    index: number;
  }>;
  type: string;
  onChange?(arg: number[]): void;
  value?: number[];
  importedAccounts?: string[];
  changeSelectedNumbers?(arg: number): void;
  end?: number;
  loadMoreItems?(): void;
  loadLength?: number;
  loading?: boolean;
  isPopup?: boolean;
}
const Row = (props) => {
  const { data, index, style } = props;
  const { accounts, others } = data;
  const { importedAccounts, _value, loading, isPopup, handleToggle } = others;

  const { t } = useTranslation();
  const imported =
    (accounts.length > 0 &&
      importedAccounts &&
      importedAccounts.length > 0 &&
      importedAccounts
        ?.map((address) => address.toLowerCase())
        .includes(accounts[index].address.toLowerCase())) ||
    0;
  const selected = _value.includes(index + 1);
  return !loading && accounts[index] ? (
    <div
      style={style}
      key={index}
      className={isPopup ? 'addresses' : 'hard-address'}
    >
      <FieldCheckbox
        checked={selected}
        onChange={() => handleToggle(index)}
        disable={
          imported && (
            <span
              className={clsx(
                'rounded-full bg-gray-bg text-gray-comment text-12 px-[5px] py-[3px]'
              )}
            >
              {t('Imported')}
            </span>
          )
        }
      >
        <AddressItem
          account={{
            address: accounts[index].address,
            type: accounts[index].type,
            brandName: BRAND_ALIAN_TYPE_TEXT[accounts[index].type],
          }}
          noNeedBalance={!imported}
          showAssets={imported}
          className="select-address-item"
          editing={false}
          showImportIcon={false}
          index={accounts[index].index}
          showIndex={true}
        />
      </FieldCheckbox>
    </div>
  ) : (
    <div
      style={style}
      key={index}
      className={isPopup ? 'addresses' : 'hard-address'}
    >
      <div className={clsx('skeleton items-center', { 'w-[460px]': !isPopup })}>
        <Skeleton.Input
          active
          className="items-center"
          style={{ width: index % 2 ? 140 : 160 }}
        />
      </div>
    </div>
  );
};
const MultiSelectAddressList = ({
  accounts,
  onChange,
  value,
  importedAccounts,
  type,
  end,
  changeSelectedNumbers,
  loadMoreItems,
  loadLength,
  loading,
  isPopup,
}: MultiSelectAddressListArgs) => {
  const fixedList = useRef<FixedSizeList>();
  const [_value, , , handleToggle] = useSelectOption<number>({
    onChange,
    value,
    options: accounts.map((x) => x.index),
  });
  useEffect(() => {
    changeSelectedNumbers && changeSelectedNumbers(_value.length);
  }, [_value]);
  useEffect(() => {
    if (end) {
      fixedList.current?.scrollToItem(end, 'center');
    }
  }, [loadLength, end]);
  const onItemsRendered = ({ overscanStartIndex, overscanStopIndex }) => {
    if (overscanStopIndex + 5 > accounts.length) {
      loadMoreItems && loadMoreItems();
    }
  };
  return (
    <FixedSizeList
      height={isPopup ? 500 : 340}
      width={isPopup ? 360 : 460}
      itemData={{
        accounts: accounts,
        others: {
          importedAccounts,
          _value,
          loading,
          isPopup,
          handleToggle,
        },
      }}
      itemCount={accounts.length}
      itemSize={60}
      ref={fixedList}
      useIsScrolling
      onItemsRendered={onItemsRendered}
      className="no-scrollbars"
    >
      {Row}
    </FixedSizeList>
  );
};

export default MultiSelectAddressList;
