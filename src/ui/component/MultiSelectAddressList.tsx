import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  memo,
} from 'react';
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
  loadMoreItems?(page: number): void;
  loadLength?: number;
  isPopup?: boolean;
  onLoadPage?(page: number): Promise<void>;
}

const Row = ({
  account,
  index,
  importedAccounts,
  value,
  isPopup,
  type,
  handleToggle,
}: {
  account: string;
  type: string;
  index: number;
  importedAccounts?: string[];
  value: number[];
  isPopup?: boolean;
  handleToggle(index: number): void;
}) => {
  const imported =
    importedAccounts &&
    importedAccounts.length > 0 &&
    importedAccounts
      ?.map((address) => address.toLowerCase())
      .includes(account.toLowerCase());
  const selected = value.includes(index + 1);
  const loading = !account;
  const { t } = useTranslation();

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

const Group = memo(
  ({
    addresses,
    index,
    groupCount = 10,
    importedAccounts,
    value,
    type,
    isPopup,
    handleToggle,
    onLoadPage,
  }: {
    addresses: { address: string; index: number }[];
    index: number;
    groupCount: number;
    importedAccounts?: string[];
    value: number[];
    type: string;
    isPopup?: boolean;
    handleToggle(index: number): void;
    onLoadPage?(page: number): Promise<void>;
  }) => {
    const groupEl = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const intersectionObserver = new IntersectionObserver(function (entries) {
        if (entries[0].intersectionRatio <= 0) return;
        onLoadPage && onLoadPage(index + 1);
      });
      intersectionObserver.observe(groupEl.current!);
      return () => {
        intersectionObserver.disconnect();
      };
    }, []);

    return (
      <div ref={groupEl}>
        {addresses.map((account) => (
          <Row
            account={account.address}
            index={account.index}
            importedAccounts={importedAccounts}
            value={value}
            type={type}
            isPopup={isPopup}
            handleToggle={handleToggle}
          />
        ))}
      </div>
    );
  }
);

const MultiSelectAddressList = forwardRef(
  (
    {
      accounts,
      onChange,
      value,
      importedAccounts,
      type,
      changeSelectedNumbers,
      loadMoreItems,
      isPopup,
      onLoadPage,
    }: MultiSelectAddressListArgs,
    ref
  ) => {
    const [_value, , , handleToggle] = useSelectOption<number>({
      onChange,
      value,
      options: accounts.map((x) => x.index),
    });
    const scrollEl = useRef<HTMLDivElement>(null);

    const handleLoadMore = () => {
      const nextPage = accounts.length / 10 + 1;
      loadMoreItems && loadMoreItems(nextPage);
    };

    useEffect(() => {
      changeSelectedNumbers && changeSelectedNumbers(_value.length);
    }, [_value]);

    useImperativeHandle(ref, () => ({
      scrollTo: (index: number) => {
        const PER_HEIGHT = 60;
        if (scrollEl.current) {
          scrollEl.current.scrollTo({
            top: PER_HEIGHT * index,
          });
        }
      },
    }));

    return (
      <div
        id="scrollableDiv"
        style={{
          height: (isPopup ? 360 : 340) + 'px',
          width: (isPopup ? 360 : 460) + 'px',
          overflow: 'auto',
        }}
        ref={scrollEl}
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
            <Group
              addresses={group}
              index={groupIndex}
              groupCount={10}
              importedAccounts={importedAccounts}
              value={_value}
              type={type}
              handleToggle={handleToggle}
              isPopup={isPopup}
              onLoadPage={onLoadPage}
            />
          ))}
        </InfiniteScroll>
      </div>
    );
  }
);

export default MultiSelectAddressList;
