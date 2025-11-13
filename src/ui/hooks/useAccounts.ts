import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { groupBy, Dictionary, omit } from 'lodash';
import { nanoid } from 'nanoid';
import React from 'react';
import { IDisplayedAccountWithBalance } from '../models/accountToDisplay';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { sortAccountsByBalance } from '../utils/account';
import { getWalletScore } from '../views/ManageAddress/hooks';
import { isSameAddress } from '../utils';

export const useAccounts = () => {
  const addressSortStore = useRabbySelector(
    (s) => s.preference.addressSortStore
  );

  // todo: store redesign
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

    const normalAccounts = highlightedAccounts
      .concat(data['0'] || [])
      .filter((e) => !!e);
    const watchModeAccounts = watchModeHighlightedAccounts
      .concat(data['1'] || [])
      .filter((e) => !!e);
    if (addressSortStore.sortType === 'usd') {
      return [normalAccounts, watchModeAccounts];
    }
    if (addressSortStore.sortType === 'alphabet') {
      const sortByAlphabet = (
        a: typeof highlightedAccounts[0],
        b: typeof highlightedAccounts[0]
      ) =>
        (a?.alianName || '').localeCompare(b?.alianName || '', 'en', {
          numeric: true,
        });
      return [
        highlightedAccounts
          .concat(data['0'].sort(sortByAlphabet))
          .filter((e) => !!e),
        watchModeHighlightedAccounts
          .concat(data['1'].sort(sortByAlphabet))
          .filter((e) => !!e),
      ];
    }

    const normalArr = groupBy(
      sortAccountsByBalance(normalAccounts),
      (e) => e.brandName
    );

    const hdKeyringGroup = groupBy(
      normalArr[KEYRING_TYPE.HdKeyring],
      (a) => a.publicKey
    );
    const ledgersGroup = groupBy(
      normalArr[KEYRING_CLASS.HARDWARE.LEDGER],
      (a) => a.hdPathBasePublicKey || nanoid()
    ) as Dictionary<IDisplayedAccountWithBalance[]>;

    console.log('sorted account', [
      [
        ...Object.values(ledgersGroup).sort((a, b) => b.length - a.length),
        ...Object.values(hdKeyringGroup).sort((a, b) => b.length - a.length),
        ...Object.values(
          omit(normalArr, [
            KEYRING_TYPE.HdKeyring,
            KEYRING_CLASS.HARDWARE.LEDGER,
          ])
        ),
        sortAccountsByBalance(watchModeAccounts),
      ]
        .filter((e) => Array.isArray(e) && e.length > 0)
        .sort((a, b) => getWalletScore(a) - getWalletScore(b)),
      [],
    ]);
    return [
      [
        ...Object.values(ledgersGroup).sort((a, b) => b.length - a.length),
        ...Object.values(hdKeyringGroup).sort((a, b) => b.length - a.length),
        ...Object.values(
          omit(normalArr, [
            KEYRING_TYPE.HdKeyring,
            KEYRING_CLASS.HARDWARE.LEDGER,
          ])
        ),
        sortAccountsByBalance(watchModeAccounts),
      ]
        .filter((e) => Array.isArray(e) && e.length > 0)
        .sort((a, b) => getWalletScore(a) - getWalletScore(b))
        .map((groupedAccount) =>
          groupedAccount.sort((a, b) => {
            const isHighlighted = (item: typeof a) => {
              return highlightedAddresses.some(
                (e) =>
                  isSameAddress(e.address, item.address) &&
                  e.brandName === item.brandName
              );
            };
            const aScore = isHighlighted(a) ? 0 : 1;
            const bScore = isHighlighted(b) ? 0 : 1;
            return aScore - bScore;
          })
        ),
      [],
    ];
  }, [accountsList, highlightedAddresses, addressSortStore.sortType]);

  const dispatch = useRabbyDispatch();

  const fetchAllAccounts = React.useCallback(() => {
    dispatch.addressManagement.getHilightedAddressesAsync().then(() => {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    });
  }, []);

  return {
    sortedAccountsList,
    watchSortedAccountsList,
    addressSortStore,
    accountsList,
    highlightedAddresses,
    loadingAccounts,
    fetchAllAccounts,
    allSortedAccountList: [
      ...(sortedAccountsList?.flat() || []),
      ...(watchSortedAccountsList || []),
    ],
  };
};
