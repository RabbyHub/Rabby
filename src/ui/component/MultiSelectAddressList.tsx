import React, { useEffect, useRef, useState } from 'react';
import { FixedSizeList } from 'react-window';
import { Skeleton, message } from 'antd';
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
  showSuspend?: boolean;
  isGrid?: boolean;
}
const Row = (props) => {
  const { data, index, style } = props;
  const { accounts, others } = data;
  const {
    importedAccounts,
    _value,
    isPopup,
    handleToggle,
    showSuspend,
    isGrid,
  } = others;
  const { t } = useTranslation();
  const imported =
    accounts.length > 0 &&
    importedAccounts &&
    importedAccounts.length > 0 &&
    importedAccounts
      ?.map((address) => address.toLowerCase())
      .includes(accounts[index]?.address?.toLowerCase());
  const selected = _value.includes(index);
  const canSelect = !(isGrid && _value.length >= 5) || selected;
  return accounts[index] && accounts[index]?.address ? (
    <div
      style={style}
      key={index}
      className={isPopup ? 'addresses' : 'hard-address'}
    >
      <FieldCheckbox
        checked={selected}
        onChange={() =>
          !canSelect
            ? message.error(
                'Due to the grid and network limitation, you can only import 5 accounts once'
              )
            : handleToggle(index)
        }
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
  showSuspend,
  isGrid,
}: MultiSelectAddressListArgs) => {
  const fixedList = useRef<FixedSizeList>();
  const [_value, , , handleToggle] = useSelectOption<number>({
    onChange,
    value,
    options: accounts.map((x, index) => index),
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
    <>
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
            showSuspend,
            isGrid,
          },
        }}
        itemCount={
          loading && showSuspend ? accounts.length + 10 : accounts.length
        }
        itemSize={60}
        ref={fixedList}
        useIsScrolling
        onItemsRendered={onItemsRendered}
        className="no-scrollbars"
      >
        {Row}
      </FixedSizeList>
    </>
  );
};

export default MultiSelectAddressList;
