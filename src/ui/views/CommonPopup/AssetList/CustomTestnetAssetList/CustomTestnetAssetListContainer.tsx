import { useRabbySelector } from '@/ui/store';
import { isSameAddress, useWallet } from '@/ui/utils';
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
import { useTranslation } from 'react-i18next';
import { EditCustomTestnetModal } from '@/ui/views/CustomTestnet/components/EditTestnetModal';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { isSameTesnetToken } from '@/utils/chain';
import { matomoRequestEvent } from '@/utils/matomo-request';

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
  const { t } = useTranslation();
  const [search, setSearch] = React.useState<string>('');
  const handleOnSearch = React.useCallback((value: string) => {
    setSearch(value);
  }, []);
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  const [isShowAddModal, setIsShowAddModal] = React.useState<boolean>(false);
  const [
    isShowAddTestnetModal,
    setIsShowAddTestnetModal,
  ] = React.useState<boolean>(false);
  const [isFetched, setIsFetched] = React.useState<boolean>(false);
  const { isDarkTheme } = useThemeMode();

  const inputRef = React.useRef<Input>(null);
  const handleFocusInput = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const [isFocus, setIsFocus] = React.useState<boolean>(false);

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
        isRemote: true,
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
    return <TokenListViewSkeleton isTestnet />;
  }

  const isNoResults = !list?.length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-x-[24px] widget-has-ant-input">
        <TokenSearchInput
          ref={inputRef}
          onSearch={handleOnSearch}
          onFocus={() => {
            setIsFocus(true);
          }}
          onBlur={() => {
            setIsFocus(false);
          }}
          className={isFocus || search ? 'w-[360px]' : 'w-[160px]'}
        />
        {isFocus || search ? null : (
          <div className="flex items-center gap-x-[12px]">
            <div
              className={clsx(
                'rounded-[6px] bg-r-neutral-card2 px-[9px] py-[7px] cursor-pointer',
                'border-[1px] border-transparent min-w-[82px] text-center',
                'hover:border-rabby-blue-default hover:bg-r-blue-light1'
              )}
            >
              <div
                className={clsx(
                  'text-r-neutral-body text-[13px] leading-[16px] cursor-pointer',
                  'flex items-center gap-x-[4px] justify-center'
                )}
                onClick={() => {
                  matomoRequestEvent({
                    category: 'Custom Network',
                    action: 'TokenList Add Network',
                  });
                  setIsShowAddTestnetModal(true);
                }}
              >
                <span className="text-r-neutral-body">
                  <RcIconAdd />
                </span>
                {t(
                  'page.dashboard.assets.TestnetAssetListContainer.addTestnet'
                )}
              </div>
            </div>
            <div
              className={clsx(
                'rounded-[6px] bg-r-neutral-card2 px-[9px] py-[7px] cursor-pointer',
                'border-[1px] border-transparent min-w-[82px] text-center',
                'hover:border-rabby-blue-default hover:bg-r-blue-light1'
              )}
            >
              <div
                className={clsx(
                  'text-r-neutral-body text-[13px] leading-[16px] cursor-pointer',
                  'flex items-center gap-x-[4px] justify-center'
                )}
                onClick={() => {
                  setIsShowAddModal(true);
                }}
              >
                <span className="text-r-neutral-body">
                  <RcIconAdd />
                </span>
                {t('page.dashboard.assets.TestnetAssetListContainer.add')}
              </div>
            </div>
          </div>
        )}
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
            onAdd={(token) => {
              if (!search) {
                mutate((prev) => {
                  return (prev || []).find((item) => {
                    return isSameTesnetToken(item, token);
                  })
                    ? prev
                    : [...(prev || []), token];
                });
              }
            }}
            onRemove={(token) => {
              if (!search) {
                mutate((prev) => {
                  return (prev || []).filter((item) => {
                    return !isSameTesnetToken(item, token);
                  });
                });
              }
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
      <EditCustomTestnetModal
        ctx={{
          ga: {
            source: 'tokenList',
          },
        }}
        visible={isShowAddTestnetModal}
        onCancel={() => {
          setIsShowAddTestnetModal(false);
        }}
        onConfirm={() => {
          setIsShowAddTestnetModal(false);
          refreshAsync();
        }}
        height={488}
        maskStyle={
          isDarkTheme
            ? {
                backgroundColor: 'transparent',
              }
            : undefined
        }
      />
    </div>
  );
};
