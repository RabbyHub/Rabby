import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';
import { Input } from 'antd';
import React from 'react';
import {
  TokenListSkeleton,
  TokenListViewSkeleton,
} from '../TokenListViewSkeleton';
import { TokenSearchInput } from '../TokenSearchInput';
import { AddCustomTestnetTokenPopup } from './AddCustomTestnetTokenPopup';
import { CustomTestnetTokenList } from './CustomTestTokenList';
import { ReactComponent as RcIconAdd } from '@/ui/assets/dashboard/portfolio/cc-add.svg';
import clsx from 'clsx';

interface Props {
  className?: string;
  visible: boolean;
  onEmptyAssets: (isEmpty: boolean) => void;
  isTestnet?: boolean;
  onRefresh?: () => void;
}

export const CustomTestnetAssetListContainer: React.FC<Props> = ({
  className,
  visible,
  onEmptyAssets,
  isTestnet = false,
  onRefresh,
}) => {
  const [search, setSearch] = React.useState<string>('');
  const handleOnSearch = React.useCallback((value: string) => {
    setSearch(value);
  }, []);
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  const [isShowAddModal, setIsShowAddModal] = React.useState<boolean>(false);
  const [isFetched, setIsFetched] = React.useState<boolean>(false);

  const inputRef = React.useRef<Input>(null);
  const handleFocusInput = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!visible) {
      setSearch('');
      inputRef.current?.setValue('');
      inputRef.current?.focus();
      inputRef.current?.blur();
    }
  }, [visible]);

  const wallet = useWallet();

  const { data: list, loading, mutate, refreshAsync } = useRequest(
    async () => {
      return wallet.getCustomTestnetTokenList({
        address: currentAccount!.address,
        q: search,
      });
    },
    {
      refreshDeps: [currentAccount, search],
      onSuccess(data) {
        if (!search) {
          onEmptyAssets(!data?.length);
        }
        setIsFetched(true);
      },
    }
  );

  if (!isFetched && !search) {
    return <TokenListViewSkeleton />;
  }

  const isNoResults = !list?.length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-x-12 widget-has-ant-input">
        <TokenSearchInput ref={inputRef} onSearch={handleOnSearch} />
        <div className="rounded-[6px] bg-r-neutral-card2 px-[10px] py-[8px] cursor-pointer">
          <div
            className={clsx(
              'text-r-neutral-body text-[13px] leading-[16px] cursor-pointer',
              'flex items-center gap-x-[4px]'
            )}
            onClick={() => {
              setIsShowAddModal(true);
            }}
          >
            <span className="text-r-neutral-body">
              <RcIconAdd />
            </span>
            add token
          </div>
        </div>
      </div>
      {loading ? (
        <TokenListSkeleton />
      ) : (
        <div className="mt-18">
          <CustomTestnetTokenList
            list={list || []}
            onFocusInput={handleFocusInput}
            isSearch={!!search}
            isNoResults={isNoResults}
            onAdd={(item) => {
              mutate((prev) => [...(prev || []), item]);
            }}
            onRemove={(item) => {
              mutate((prev) => {
                return prev?.filter(
                  (i) => !(i.id === item.id && i.chainId === item.chainId)
                );
              });
            }}
          />
        </div>
      )}
      <AddCustomTestnetTokenPopup
        visible={isShowAddModal}
        onClose={() => {
          setIsShowAddModal(false);
        }}
        onConfirm={() => {
          setIsShowAddModal(false);
          refreshAsync();
        }}
      />
    </div>
  );
};
