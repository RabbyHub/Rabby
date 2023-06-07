import {
  KEYRING_CLASS,
  KEYRING_ICONS,
  KEYRING_TYPE,
  WALLET_BRAND_CONTENT,
} from '@/constant';
import { PageHeader } from '@/ui/component';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { groupBy, omit, set, sortBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';
import { ReactComponent as IconShowSeedPhrase } from '@/ui/assets/address/show-seed-phrase.svg';
import { ReactComponent as IconDelete } from '@/ui/assets/address/delete.svg';
import { useWallet } from '@/ui/utils';
import { useAsync } from 'react-use';
import { nanoid } from 'nanoid';
import AddressItem from './AddressItem';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { VariableSizeList as VList } from 'react-window';

import IconPinned from 'ui/assets/icon-pinned.svg';
import IconPinnedFill from 'ui/assets/icon-pinned-fill.svg';
import { obj2query } from '@/ui/utils/url';
import { useHistory } from 'react-router-dom';
import AuthenticationModalPromise from '@/ui/component/AuthenticationModal';
import { AddressDeleteModal } from './AddressDeleteModal';
import { message } from 'antd';
import IconSuccess from '@/ui/assets/success.svg';

const getWalletTypeName = (s: string) => {
  if (s === KEYRING_TYPE['SimpleKeyring']) {
    return 'Private Key';
  }
  if (s === KEYRING_TYPE['HdKeyring']) {
    return 'Seed Phrase';
  }
  return s;
};

const useWalletTypeData = () => {
  const wallet = useWallet();
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

  const { value, loading, error } = useAsync(async () => {
    const walletGroup = groupBy(sortedAccountsList, (a) => a.brandName);
    const hdKeyring = await Promise.all(
      (walletGroup[KEYRING_TYPE['HdKeyring']] || []).map(async (e) => {
        try {
          const mnemonics = await wallet.getMnemonicByAddress(e.address);
          const result = await wallet.generateKeyringWithMnemonic(mnemonics);

          return { ...e, keyringId: result.keyringId };
        } catch (error) {
          return { ...e, keyringId: nanoid() };
        }
      })
    );

    const hdKeyringGroup = groupBy(hdKeyring, (a) => a.keyringId);

    const ledgers = await Promise.all(
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

    const ledgersGroup = groupBy(ledgers, (a) => a.hdPathBasePublicKey);

    const v = (Object.values({
      ...omit(walletGroup, [
        KEYRING_TYPE['WatchAddressKeyring'],
        KEYRING_TYPE['HdKeyring'],
        KEYRING_CLASS.HARDWARE.LEDGER,
      ]),
      ...hdKeyringGroup,
      ...ledgersGroup,
      //   ...walletConnectList,
    }) as (IDisplayedAccountWithBalance & {
      hdPathBasePublicKey?: string;
      keyringId?: string | number;
    })[][]).sort((a, b) => b.length - a.length);
    v.push(watchSortedAccountsList);

    return v.filter((e) => Boolean(e) && e.length > 0);
  }, [sortedAccountsList, watchSortedAccountsList, wallet]);

  return {
    accountGroup: value,
    loading: loading || loadingAccounts,
    highlightedAddresses,
  };
};

const useBackUp = () => {
  const wallet = useWallet();
  const history = useHistory();

  const handleBackup = React.useCallback(
    async (path: 'mneonics' | 'private-key', address: string, type: string) => {
      let data = '';
      await AuthenticationModalPromise({
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        title: `Backup ${
          path === 'private-key' ? 'Private Key' : 'Seed Phrase'
        }`,
        validationHandler: async (password: string) => {
          if (path === 'private-key') {
            data = await wallet.getPrivateKey(password, {
              address,
              type,
            });
          } else {
            data = await wallet.getMnemonics(password, address);
          }
        },
        onFinished() {
          history.push({
            pathname: `/settings/address-backup/${path}`,
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

// const deleteModal = async () => {
//   await AuthenticationModalPromise({
//     confirmText: 'Confirm',
//     cancelText: 'Cancel',
//     title: 'Delete address',
//     description:
//       'Before you delete, keep the following points in mind to understand how to protect your assets.',
//     checklist: [
//       'I understand that if I delete this address, the corresponding Private Key & Seed Phrase of this address will be deleted and Rabby will NOT be able to recover it.',
//       "I confirm that I have backuped the private key or Seed Phrase and I'm ready to delete it now.",
//     ],
//     onFinished() {
//       handleDeleteAddress();
//     },
//     onCancel() {
//       // do nothing
//     },
//     wallet,
//   });
// };

const ManageAddress = () => {
  const history = useHistory();

  const dispatch = useRabbyDispatch();

  const [activeIndex, setActiveIndex] = useState(0);

  const { accountGroup: types, highlightedAddresses } = useWalletTypeData();

  const isSeedPhrase =
    types?.[activeIndex]?.[0].brandName === KEYRING_TYPE['HdKeyring'];

  console.log('types', types);

  const switchAccount = async (account: IDisplayedAccountWithBalance) => {
    await dispatch.account.changeAccountAsync(account);
    history.push('/dashboard');
  };

  const backup = useBackUp();

  const Row = (props) => {
    const { data, index, style } = props;
    const account = data[index];
    const favorited = highlightedAddresses.some(
      (highlighted) =>
        account.address === highlighted.address &&
        account.brandName === highlighted.brandName
    );

    return (
      <div className="address-wrap-with-padding px-[20px]" style={style}>
        <AddressItem
          balance={account.balance}
          address={account.address}
          type={account.type}
          brandName={account.brandName}
          alias={account.alianName}
          forceFastDelete
          //   isUpdatingBalance={isUpdateAllBalanceLoading}
          extra={
            <div
              className={clsx(
                'icon-star  border-none px-0',
                favorited ? 'is-active' : 'opacity-0 group-hover:opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation();
                dispatch.addressManagement.toggleHighlightedAddressAsync({
                  address: account.address,
                  brandName: account.brandName,
                });
              }}
            >
              <img
                className="w-[13px] h-[13px]"
                src={favorited ? IconPinnedFill : IconPinned}
                alt=""
              />
            </div>
          }
          onClick={() => {
            history.push(
              `/settings/address-detail?${obj2query({
                address: account.address,
                type: account.type,
                brandName: account.brandName,
                byImport: account.byImport || '',
              })}`
            );
          }}
          onSwitchCurrentAccount={() => {
            switchAccount(account);
          }}
          enableSwitch={false}
        />
      </div>
    );
  };

  const [open, setOpen] = useState(false);

  const wallet = useWallet();

  return (
    <div className="page-address-management px-0 pb-0 bg-[#F0F2F5] overflow-hidden">
      <div className="px-20">
        <PageHeader className="pt-[24px]">Manage Address</PageHeader>
        <div className="rounded-[6px] bg-white flex flex-wrap p-[3px]">
          {types?.map((items, index) => (
            <TypeItem
              item={items[0]}
              active={index === activeIndex}
              count={items.length}
              onChange={() => {
                setActiveIndex(index);
              }}
            />
          ))}
        </div>
        {!!types?.length && (
          <div className="flex items-center justify-between mt-20">
            <div>{getWalletTypeName(types[activeIndex][0].brandName)}</div>
            <div className="flex items-center gap-16">
              {isSeedPhrase && (
                <IconShowSeedPhrase
                  className="cursor-pointer"
                  onClick={() => {
                    backup('mneonics', types[0][0].address, types[0][0].type);
                  }}
                />
              )}
              <IconDelete
                className="cursor-pointer"
                onClick={() => {
                  if (
                    ![
                      KEYRING_TYPE['HdKeyring'],
                      KEYRING_TYPE['SimpleKeyring'],
                    ].includes(types?.[activeIndex]?.[0]?.type)
                  ) {
                    setOpen(true);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {!!types?.[activeIndex]?.length && (
        <VList
          height={450}
          width="100%"
          itemData={types?.[activeIndex]}
          itemCount={types?.[activeIndex].length}
          itemSize={() => 64}
          className="w-auto"
        >
          {Row}
        </VList>
      )}

      {types?.[activeIndex]?.length && (
        <AddressDeleteModal
          visible={open}
          onClose={() => setOpen(false)}
          onSubmit={async () => {
            await Promise.all(
              types?.[activeIndex]?.map((e) =>
                wallet.removeAddress(e.address, e.type, e.brandName)
              )
            );
            setOpen(false);
            message.success({
              icon: <img src={IconSuccess} className="icon icon-success" />,
              content: 'Deleted',
              duration: 0.5,
            });
          }}
          item={types?.[activeIndex]?.[0]}
          count={types?.[activeIndex]?.length || 0}
        />
      )}
    </div>
  );
};

const TypeItem = ({
  item,
  active,
  count,
  onChange,
}: //   setActive
{
  item: IDisplayedAccountWithBalance;
  active: boolean;
  count: number;
  onChange: () => void;
}) => {
  console.log('item', item);
  const { address, brandName, type } = item;
  const brandIcon = useWalletConnectIcon({
    address,
    brandName,
    type,
  });

  const addressTypeIcon = useMemo(
    () =>
      brandIcon ||
      KEYRING_ICONS[type] ||
      WALLET_BRAND_CONTENT?.[brandName]?.image,
    [type, brandName, brandIcon]
  );
  return (
    <div
      onClick={onChange}
      className={clsx(
        'w-[59px] h-[44px] rounded-[4px] flex items-center justify-center cursor-pointer',
        active && 'bg-blue-light bg-opacity-[0.15]'
      )}
    >
      <div className="relative flex items-center justify-center">
        <img src={addressTypeIcon} className="rounded-full w-24 h-24" />
        <div className="absolute -top-6 -right-6 text-12 text-gray-content bg-gray-divider border-white h-14 px-[4px] border-width-[0.5px] rounded-[90px]">
          {count}
        </div>
      </div>
    </div>
  );
};

export default ManageAddress;
