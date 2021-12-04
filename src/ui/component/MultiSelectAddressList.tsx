import React, { useEffect, useRef } from 'react';
import { FixedSizeList, areEqual } from 'react-window';
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
  const { t } = useTranslation();
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
  const Row = (props) => {
    const { data, index, style, isScrolling } = props;
    const { accounts } = data;
    //console.log(accounts, 88);
    const imported =
      importedAccounts &&
      importedAccounts.length > 0 &&
      importedAccounts
        ?.map((address) => address.toLowerCase())
        .includes(accounts[index].address.toLowerCase());
    const selected = _value.includes(index + 1);
    //console.log(accounts, 99999);
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
              type,
              brandName: BRAND_ALIAN_TYPE_TEXT[type],
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
        <div
          className={clsx('skeleton items-center', { 'w-[460px]': !isPopup })}
        >
          <Skeleton.Input
            active
            className="items-center"
            style={{ width: index % 2 ? 140 : 160 }}
          />
        </div>
      </div>
    );
  };
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
        accounts,
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
