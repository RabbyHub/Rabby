import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { groupBy, omit } from 'lodash';
import { nanoid } from 'nanoid';
import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useAsync } from 'react-use';
import AuthenticationModalPromise from '@/ui/component/AuthenticationModal';

export type DisplayedAccount = IDisplayedAccountWithBalance & {
  hdPathBasePublicKey?: string;
};

export type TypeKeyringGroup = {
  name: string;
  index?: number;
  list: DisplayedAccount[];
  type: string;
  brandName?: string;
  publicKey?: string;
};

export const getWalletTypeName = (s: string) => {
  if (s === KEYRING_TYPE['SimpleKeyring']) {
    return 'Private Key';
  }
  if (s === KEYRING_TYPE['HdKeyring']) {
    return 'Seed Phrase';
  }
  return s;
};

export const getTypeGroup = (arr: DisplayedAccount[]) => {
  return {
    name: getWalletTypeName(arr?.[0]?.brandName || arr?.[0].type),
    list: arr,
    type: arr?.[0].type,
    brandName: arr?.[0]?.brandName,
    publicKey: arr?.[0]?.publicKey,
  } as TypeKeyringGroup;
};

export const useWalletTypeData = () => {
  const wallet = useWallet();
  const {
    accountsList,
    highlightedAddresses = [],
    loadingAccounts,
  } = useRabbySelector((s) => ({
    ...s.accountToDisplay,
    highlightedAddresses: s.addressManagement.highlightedAddresses,
  }));

  console.log('accountsList', accountsList);

  const [sortedAccountsList, watchSortedAccountsList] = useMemo(() => {
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

  const { value, loading, error } = useAsync(async () => {
    const walletGroup = groupBy(sortedAccountsList, (a) => a.brandName);

    const hdKeyringGroup = groupBy(
      walletGroup[KEYRING_TYPE['HdKeyring']],
      (a) => a.publicKey
    );

    const notEmptyHdKeyringList = Object.values(hdKeyringGroup).map(
      (item, index, arr) => ({
        ...getTypeGroup(item),
        name:
          getWalletTypeName(item[0].brandName) +
          (arr.length ? ` ${index + 1}` : ''),
      })
    ) as TypeKeyringGroup[];

    const hdKeyringGroups = await wallet.getAllClassAccounts();

    console.log('getAllClassAccounts', hdKeyringGroups);

    const emptyHdKeyringList: TypeKeyringGroup[] = [];
    hdKeyringGroups?.forEach((item, index, arr) => {
      if (
        item.accounts.length === 0 &&
        item.type === KEYRING_TYPE['HdKeyring']
      ) {
        emptyHdKeyringList.push({
          list: [] as DisplayedAccount[],
          name:
            getWalletTypeName(item.keyring.type) +
            (arr.length + notEmptyHdKeyringList.length
              ? ` ${notEmptyHdKeyringList.length + index + 1}`
              : ''),
          type: item.type,
          publicKey: item.publicKey,
        });
      }
    });

    const hdKeyRingList = [
      ...notEmptyHdKeyringList,
      ...emptyHdKeyringList,
    ].sort((a, b) => b.list.length - a.list.length);

    const ledgerAccounts = await Promise.all(
      (walletGroup[KEYRING_CLASS.HARDWARE.LEDGER] || []).map(async (e) => {
        try {
          const res = await wallet.requestKeyring(
            KEYRING_CLASS.HARDWARE.LEDGER,
            'getAccountInfo',
            null,
            e.address
          );
          return { ...e, hdPathBasePublicKey: res.hdPathBasePublicKey };
        } catch (error) {
          return { ...e, hdPathBasePublicKey: nanoid() };
        }
      })
    );

    console.log('hdKeyringGroup', hdKeyringGroup);

    const ledgersGroup = groupBy(ledgerAccounts, (a) => a.hdPathBasePublicKey);

    const ledgerList = Object.values(ledgersGroup)
      .sort((a, b) => b.length - a.length)
      .map((item, index, arr) => ({
        ...getTypeGroup(item),
        name:
          getWalletTypeName(item[0].brandName) +
          (arr.length ? ` ${index + 1}` : ''),
      })) as TypeKeyringGroup[];

    const v = (Object.values({
      ...omit(walletGroup, [
        KEYRING_TYPE['WatchAddressKeyring'],
        KEYRING_TYPE['HdKeyring'],
        KEYRING_CLASS.HARDWARE.LEDGER,
      ]),
    }) as DisplayedAccount[][]).map((item) => [getTypeGroup(item)]);

    v.push(hdKeyRingList, ledgerList);

    v.sort(
      (a, b) =>
        b.reduce((pre, e) => pre + e.list.length, 0) -
        a.reduce((pre, e) => pre + e.list.length, 0)
    );

    if (watchSortedAccountsList.length) {
      v.push([
        {
          name: 'Watch Address',
          list: watchSortedAccountsList,
          type: KEYRING_TYPE['WatchAddressKeyring'],
        },
      ]);
    }

    return v.flat();
  }, [sortedAccountsList, watchSortedAccountsList, wallet]);

  return {
    accountGroup: value,
    loading: loading || loadingAccounts,
    highlightedAddresses,
  };
};

export const useBackUp = () => {
  const wallet = useWallet();
  const history = useHistory();

  const handleBackup = useCallback(
    async (publicKey: string) => {
      await AuthenticationModalPromise({
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        title: `Backup Seed Phrase`,

        async onFinished() {
          const data = await wallet.getMnemonicFromPublicKey(publicKey);
          history.push({
            pathname: `/settings/address-backup/mneonics`,
            state: {
              data: data,
              goBack: true,
            },
          });
        },
        onCancel() {
          // do nothing
        },
        wallet,
      });
    },
    [wallet?.getPrivateKey, wallet?.getMnemonics]
  );
  return handleBackup;
};
