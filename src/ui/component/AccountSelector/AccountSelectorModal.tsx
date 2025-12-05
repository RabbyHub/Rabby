/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import { Drawer, DrawerProps, Input } from 'antd';
import React, { ReactNode, useEffect, useMemo } from 'react';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { KEYRING_TYPE } from 'consts';
import IconSearch from 'ui/assets/search.svg';

import { Account } from '@/background/service/preference';
import { useAccounts } from '@/ui/hooks/useAccounts';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { isSameAccount } from '@/utils/account';
import { flatten } from 'lodash';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import styled from 'styled-components';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';
import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import { AccountItem } from './AccountItem';
import { isSameAddress } from '@/ui/utils';

const Warper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;

  .header.header {
    padding-bottom: 16px;
    background: var(--r-neutral-bg2, #f2f4f7);
    flex-shrink: 0;
    .ant-input-affix-wrapper {
      border: 1px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
      background: var(--r-neutral-card-1, rgba(255, 255, 255, 0.06));
      border-radius: 6px;
      height: 44px;
      border-width: 1px;

      input::placeholder {
        color: var(--r-neutral-foot, #6a7587);
      }
    }

    .ant-input-affix-wrapper:focus,
    .ant-input-affix-wrapper-focused {
      border-color: var(--r-blue-default);
    }
  }

  .virtuoso-list {
    height: 100%;
    flex: 1;
    &::-webkit-scrollbar {
      display: none !important;
    }
  }
`;

interface ChainSelectorModalProps {
  visible: boolean;
  value?: Account | null;
  onCancel(): void;
  onChange(val: Account): void;
  connection?: boolean;
  title?: ReactNode;
  className?: string;
  height?: number | string;
  zIndex?: number;
  showClosableIcon?: boolean;
  showWhitelistIcon?: boolean;
  getContainer?: DrawerProps['getContainer'];
}

export const AccountSelectorModal = ({
  title,
  visible,
  onCancel,
  onChange,
  value,
  className,
  height = 540,
  zIndex,
  showClosableIcon = true,
  showWhitelistIcon = false,
  getContainer,
}: ChainSelectorModalProps) => {
  const handleCancel = () => {
    onCancel();
  };

  const { t } = useTranslation();

  const {
    sortedAccountsList,
    watchSortedAccountsList,
    addressSortStore,
    accountsList,
    highlightedAddresses,
    fetchAllAccounts,
    loadingAccounts,
    allSortedAccountList,
  } = useAccounts();
  const [searchKeyword, setSearchKeyword] = React.useState(
    addressSortStore?.search || ''
  );
  const debouncedSearchKeyword = useDebounceValue(searchKeyword, 250);

  const {
    accountList,
    filteredAccounts,
    noAnyAccount,
    noAnySearchedAccount,
  } = useMemo(() => {
    const result = {
      accountList: allSortedAccountList,
      filteredAccounts: [] as typeof sortedAccountsList,
      noAnyAccount: false,
      noAnySearchedAccount: false,
    };

    result.filteredAccounts = [...result.accountList];
    if (addressSortStore.sortType === 'addressType') {
      result.filteredAccounts = sortedAccountsList;
    }

    if (debouncedSearchKeyword) {
      const lKeyword = debouncedSearchKeyword.toLowerCase();

      if (addressSortStore.sortType === 'addressType') {
        result.filteredAccounts = (result.filteredAccounts as IDisplayedAccountWithBalance[][])
          .map((group) =>
            group.filter((account) => {
              const lowerAddress = account.address.toLowerCase();
              const aliasName = account.alianName?.toLowerCase();
              let addrIncludeKw = false;
              if (lKeyword.replace(/^0x/, '').length >= 2) {
                addrIncludeKw = account.address
                  .toLowerCase()
                  .includes(lKeyword.toLowerCase());
              }

              return (
                lowerAddress === lKeyword ||
                aliasName?.includes(lKeyword) ||
                addrIncludeKw
              );
            })
          )
          .filter((group) => group.length > 0);
      } else {
        result.filteredAccounts = result.accountList.filter((account) => {
          const lowerAddress = account.address.toLowerCase();
          const aliasName = account.alianName?.toLowerCase();
          let addrIncludeKw = false;
          if (lKeyword.replace(/^0x/, '').length >= 2) {
            addrIncludeKw = account.address
              .toLowerCase()
              .includes(lKeyword.toLowerCase());
          }

          return (
            lowerAddress === lKeyword ||
            aliasName?.includes(lKeyword) ||
            addrIncludeKw
          );
        });
      }
    }

    result.noAnyAccount = result.accountList.length <= 0 && !loadingAccounts;
    result.noAnySearchedAccount =
      result.filteredAccounts.length <= 0 && !loadingAccounts;

    return {
      ...result,
      filteredAccounts: flatten(result.filteredAccounts),
    };
  }, [
    allSortedAccountList,
    addressSortStore.sortType,
    debouncedSearchKeyword,
    loadingAccounts,
    sortedAccountsList,
  ]);

  const { whitelist } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
  }));

  useEffect(() => {
    fetchAllAccounts();
  }, [fetchAllAccounts]);

  const dispatch = useRabbyDispatch();
  useEffect(() => {
    dispatch.whitelist.getWhitelist();
  }, [dispatch.whitelist]);

  useEffect(() => {
    if (!visible) {
      setSearchKeyword('');
    }
  }, [visible]);

  return (
    <>
      <Drawer
        title={title || t('component.AccountSelectorModal.title')}
        width="400px"
        height={height}
        closable={showClosableIcon}
        placement={'bottom'}
        visible={visible}
        onClose={handleCancel}
        className={clsx('custom-popup is-support-darkmode is-new', className)}
        zIndex={zIndex}
        destroyOnClose
        closeIcon={
          <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot" />
        }
        getContainer={getContainer}
        bodyStyle={{
          paddingBottom: 0,
        }}
      >
        <Warper>
          <header className="header">
            <Input
              prefix={<img src={IconSearch} />}
              placeholder={t(
                'component.AccountSelectorModal.searchPlaceholder'
              )}
              onChange={(e) => setSearchKeyword(e.target.value)}
              value={searchKeyword}
              allowClear
            />
          </header>
          <Virtuoso
            className="virtuoso-list"
            data={filteredAccounts}
            itemContent={(index, item) => {
              const current = item;
              const prev = filteredAccounts[index - 1];
              const next = filteredAccounts[index + 1];
              const isGroupFirst =
                !prev ||
                (prev?.type !== KEYRING_TYPE.WatchAddressKeyring &&
                  current?.type === KEYRING_TYPE.WatchAddressKeyring);
              const isGroupLast =
                !next ||
                (current?.type !== KEYRING_TYPE.WatchAddressKeyring &&
                  next?.type === KEYRING_TYPE.WatchAddressKeyring);

              const isFavorite = highlightedAddresses.some(
                (highlighted) =>
                  item.address === highlighted.address &&
                  item.brandName === highlighted.brandName
              );

              const isLast = !next;

              return (
                <>
                  <div
                    style={{
                      borderBottom:
                        '0.5px solid var(--r-neutral-line, #E0E5EC)',
                      background: 'var(--r-neutral-card1, #FFF)',
                      ...(isGroupFirst
                        ? {
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                          }
                        : {}),
                      ...(isGroupLast
                        ? {
                            borderBottomLeftRadius: 12,
                            borderBottomRightRadius: 12,
                            marginBottom: 16,
                            borderBottom: 'none',
                          }
                        : {}),
                    }}
                  >
                    <AccountItem
                      className="group"
                      balance={item.balance}
                      address={item.address}
                      type={item.type}
                      brandName={item.brandName}
                      onClick={() => {
                        onChange?.(item);
                      }}
                      showWhitelistIcon={
                        showWhitelistIcon &&
                        whitelist.some((addr) =>
                          isSameAddress(addr, item.address)
                        )
                      }
                      isSelected={!!value && isSameAccount(item, value)}
                      extra={
                        <div
                          className={clsx(
                            'cursor-pointer border-none px-0',
                            isFavorite
                              ? 'is-active'
                              : 'opacity-0 group-hover:opacity-100'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch.addressManagement.toggleHighlightedAddressAsync(
                              {
                                address: item.address,
                                brandName: item.brandName,
                              }
                            );
                          }}
                        >
                          <ThemeIcon
                            className="w-[13px] h-[13px]"
                            src={isFavorite ? RcIconPinnedFill : RcIconPinned}
                          />
                        </div>
                      }
                    />
                  </div>
                  {isLast ? <div className="h-[8px]"></div> : null}
                </>
              );
            }}
            increaseViewportBy={100}
          ></Virtuoso>
        </Warper>
      </Drawer>
    </>
  );
};
