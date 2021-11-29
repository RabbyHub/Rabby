import React, { useEffect, useRef } from 'react';
import { chunk } from 'lodash';
import InfiniteScroll from 'react-infinite-scroll-component';
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
  isPopup,
}: MultiSelectAddressListArgs) => {
  const { t } = useTranslation();
  const [_value, , , handleToggle] = useSelectOption<number>({
    onChange,
    value,
    options: accounts.map((x) => x.index),
  });

  useEffect(() => {
    changeSelectedNumbers && changeSelectedNumbers(_value.length);
  }, [_value]);

  const Row = ({ account, index }: { account: string; index: number }) => {
    const imported =
      importedAccounts &&
      importedAccounts.length > 0 &&
      importedAccounts
        ?.map((address) => address.toLowerCase())
        .includes(account);

    const selected = _value.includes(index + 1);

    const loading = !account;

    return !loading ? (
      <div key={index} className={isPopup ? 'address' : 'hard-address'}>
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
              address: account,
              type,
              brandName: BRAND_ALIAN_TYPE_TEXT[type],
            }}
            noNeedBalance={!imported}
            showAssets={imported}
            className="select-address-item"
            editing={false}
            showImportIcon={false}
            index={index}
            showIndex={true}
          />
        </FieldCheckbox>
      </div>
    ) : (
      <div key={index} className={isPopup ? 'address' : 'hard-address'}>
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

  const Group = ({
    addresses,
    index,
    groupCount = 10,
  }: {
    addresses: { address: string; index: number }[];
    index: number;
    groupCount: number;
  }) => {
    const groupEl = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const intersectionObserver = new IntersectionObserver(function (entries) {
        if (entries[0].intersectionRatio <= 0) return;
        const isLoaded = !addresses.find(({ address }) => !address);
        if (isLoaded) return;
        console.log('in view', index);
      });
      // start observing
      intersectionObserver.observe(groupEl.current!);
    }, []);
    return (
      <div ref={groupEl}>
        {addresses.map((account) => (
          <Row account={account.address} index={account.index} />
        ))}
      </div>
    );
  };

  const handleLoadMore = () => {
    loadMoreItems && loadMoreItems();
  };

  return (
    <div
      id="scrollableDiv"
      style={{
        height: (isPopup ? 360 : 340) + 'px',
        width: (isPopup ? 360 : 460) + 'px',
        overflow: 'auto',
      }}
    >
      <InfiniteScroll
        hasMore={true}
        next={handleLoadMore}
        dataLength={accounts.length}
        loader={<></>}
        className="no-scrollbars"
        scrollableTarget="scrollableDiv"
      >
        {chunk(accounts, 10).map((group, groupIndex) => (
          <Group addresses={group} index={groupIndex} groupCount={10} />
        ))}
      </InfiniteScroll>
    </div>
  );
};

export default MultiSelectAddressList;
