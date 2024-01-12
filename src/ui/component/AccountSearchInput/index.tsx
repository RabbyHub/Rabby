import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input, InputProps, Popover } from 'antd';
import { TextAreaProps } from 'antd/lib/input/TextArea';
import { groupBy } from 'lodash';
import { useClickAway } from 'react-use';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { KEYRING_CLASS } from '@/constant';
import { sortAccountsByBalance } from '@/ui/utils/account';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
import { useThemeMode } from '@/ui/hooks/usePreference';
import cx from 'clsx';

import AddressItem from './AddressItem';

import './index.less';
import type { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcNoMatchedAddress } from '@/ui/assets/address/no-matched-addr.svg';
import ThemeIcon from '../ThemeMode/ThemeIcon';

function useSearchAccount(searchKeyword?: string) {
  const {
    accountsList,
    highlightedAddresses = [],
    loadingAccounts,
  } = useRabbySelector((s) => ({
    ...s.accountToDisplay,
    highlightedAddresses: s.addressManagement.highlightedAddresses,
  }));

  const [sortedAccountsList, watchSortedAccountsList] = React.useMemo(() => {
    const restAccounts = [...accountsList];
    let highlightedAccounts: typeof accountsList = [];
    let watchModeHighlightedAccounts: typeof accountsList = [];

    highlightedAddresses.forEach((highlighted) => {
      const idx = restAccounts.findIndex(
        (account) =>
          account.address === highlighted.address &&
          account.brandName === highlighted.brandName
      );
      if (idx > -1) {
        if (restAccounts[idx].type === KEYRING_CLASS.WATCH) {
          watchModeHighlightedAccounts.push(restAccounts[idx]);
        } else {
          highlightedAccounts.push(restAccounts[idx]);
        }
        restAccounts.splice(idx, 1);
      }
    });
    const data = groupBy(restAccounts, (e) =>
      e.type === KEYRING_CLASS.WATCH ? '1' : '0'
    );

    highlightedAccounts = sortAccountsByBalance(highlightedAccounts);
    watchModeHighlightedAccounts = sortAccountsByBalance(
      watchModeHighlightedAccounts
    );

    return [
      highlightedAccounts.concat(data['0'] || []).filter((e) => !!e),
      watchModeHighlightedAccounts.concat(data['1'] || []).filter((e) => !!e),
    ];
  }, [accountsList, highlightedAddresses]);

  const debouncedSearchKeyword = useDebounceValue(searchKeyword, 250);

  const {
    accountList,
    filteredAccounts,
    noAnyAccount,
    noAnySearchedAccount,
  } = useMemo(() => {
    const result = {
      accountList: [
        ...(sortedAccountsList || []),
        ...(watchSortedAccountsList || []),
      ],
      filteredAccounts: [] as typeof sortedAccountsList,
      noAnyAccount: false,
      noAnySearchedAccount: false,
    };
    result.filteredAccounts = [...result.accountList];

    if (debouncedSearchKeyword) {
      const lKeyword = debouncedSearchKeyword.toLowerCase();

      result.filteredAccounts = result.accountList.filter((account) => {
        const aliasName = account.alianName?.toLowerCase();
        let addrIncludeKw = false;
        if (lKeyword.replace(/^0x/, '').length >= 2) {
          addrIncludeKw = account.address
            .toLowerCase()
            .includes(lKeyword.toLowerCase());
        }
        return aliasName?.includes(lKeyword) || addrIncludeKw;
      });
    }

    result.noAnyAccount = result.accountList.length <= 0 && !loadingAccounts;
    result.noAnySearchedAccount =
      !!debouncedSearchKeyword &&
      result.filteredAccounts.length <= 0 &&
      !loadingAccounts;

    return result;
  }, [sortedAccountsList, watchSortedAccountsList, debouncedSearchKeyword]);

  const dispatch = useRabbyDispatch();

  useEffect(() => {
    dispatch.addressManagement.getHilightedAddressesAsync().then(() => {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    });
  }, []);

  return {
    accountList,
    filteredAccounts,
    noAnyAccount,
    noAnySearchedAccount,
  };
}

function NoSearchedAddressUI() {
  const { t } = useTranslation();
  return (
    <div className="no-matched-address h-[120px]">
      <ThemeIcon className="w-[28px] h-[28px]" src={RcNoMatchedAddress} />
      <p className="text-13 mt-[10px] text-r-neutral-body">
        {t('component.AccountSearchInput.noMatchAddress')}
      </p>
    </div>
  );
}

interface AccountSearchInputProps extends TextAreaProps {
  onSelectedAccount?: (account: IDisplayedAccountWithBalance) => void;
}

const AccountSearchInput = React.forwardRef<any, AccountSearchInputProps>(
  (
    {
      onSelectedAccount,
      value,
      onChange,
      ...inputProps
    }: AccountSearchInputProps,
    ref
  ) => {
    const searchKeyword = useMemo(() => value + '', [value]);
    const { filteredAccounts, noAnySearchedAccount } = useSearchAccount(
      searchKeyword
    );
    const { isDarkTheme } = useThemeMode();

    const [inputFocusing, setInputFocusing] = useState(false);

    const isInputAddrLike = useMemo(() => {
      return searchKeyword?.startsWith('0x') && searchKeyword?.length === 42;
    }, [searchKeyword]);

    const wrapperRef = useRef<HTMLDivElement>(null);

    useClickAway(wrapperRef, (event: MouseEvent) => {
      const targetEl = event.target as HTMLElement;
      const inComponent = wrapperRef.current?.contains(targetEl);
      if (!inComponent) {
        setInputFocusing(false);
      }
    });

    return (
      <div ref={wrapperRef} className="account-search-input-wrapper">
        <Popover
          trigger={['none']}
          visible={!!searchKeyword && !isInputAddrLike && inputFocusing}
          placement="bottom"
          className="account-search-popover-input"
          overlayClassName={cx('account-search-input-overlay', {
            'dark-mode': isDarkTheme,
          })}
          align={{
            targetOffset: [0, 10],
          }}
          getPopupContainer={() => wrapperRef.current || document.body}
          destroyTooltipOnHide
          content={
            <div className="account-search-input-results">
              {noAnySearchedAccount ? (
                <NoSearchedAddressUI />
              ) : (
                filteredAccounts.map((account, idx) => {
                  return (
                    <div
                      key={`account-search-item-${account.brandName}-${account.address}-${idx}`}
                      className="account-search-item"
                    >
                      <AddressItem
                        balance={account.balance}
                        address={account.address}
                        type={account.type}
                        brandName={account.brandName}
                        alias={account.alianName}
                        onConfirm={() => {
                          onSelectedAccount?.(account);
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          }
        >
          <Input.TextArea
            autoComplete="off"
            autoFocus
            autoSize
            spellCheck={false}
            {...inputProps}
            ref={ref}
            value={searchKeyword}
            onChange={onChange}
            onFocus={(e) => {
              setInputFocusing(true);
              inputProps.onFocus?.(e);
            }}
          />
        </Popover>
      </div>
    );
  }
);

export default AccountSearchInput;
