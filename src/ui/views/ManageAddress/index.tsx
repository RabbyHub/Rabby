import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { Empty, PageHeader } from '@/ui/component';
import { useRabbyDispatch } from '@/ui/store';
import clsx from 'clsx';
import React, { useCallback, useState } from 'react';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';
import { ReactComponent as IconShowSeedPhrase } from '@/ui/assets/address/show-seed-phrase.svg';
import { ReactComponent as IconDelete } from '@/ui/assets/address/delete.svg';
import { openInternalPageInTab, useWallet } from '@/ui/utils';
import { VariableSizeList as VList } from 'react-window';

import IconPinned from 'ui/assets/icon-pinned.svg';
import IconPinnedFill from 'ui/assets/icon-pinned-fill.svg';
import { obj2query } from '@/ui/utils/url';
import { useHistory } from 'react-router-dom';
import AuthenticationModalPromise from '@/ui/component/AuthenticationModal';
import { AddressDeleteModal } from './AddressDeleteModal';
import { Button, message } from 'antd';
import IconSuccess from '@/ui/assets/success.svg';
import AddressItem from '../AddressManagement/AddressItem';
import { GroupItem } from './GroupItem';
import { useBackUp, useWalletTypeData } from './hooks';
import { SeedPhraseDeleteModal } from './SeedPhraseDelete';

const ManageAddress = () => {
  const history = useHistory();

  const wallet = useWallet();

  const dispatch = useRabbyDispatch();

  const [activeIndex, setActiveIndex] = useState(0);

  const { accountGroup: types, highlightedAddresses } = useWalletTypeData();

  const isSeedPhrase = types?.[activeIndex]?.type === KEYRING_TYPE['HdKeyring'];

  console.log('types', types);

  const switchAccount = async (account: IDisplayedAccountWithBalance) => {
    await dispatch.account.changeAccountAsync(account);
    history.push('/dashboard');
  };

  const backup = useBackUp();

  const [open, setOpen] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState(false);

  const [seedPhraseDeleteOpen, setSeedPhraseDeleteOpen] = useState(false);

  const [deleteList, setDeleteList] = useState<IDisplayedAccountWithBalance[]>(
    []
  );

  const AuthenticationDeleteModalPromise = useCallback(
    async (title: string, onFinished: () => void, onCancel?: () => void) => {
      await AuthenticationModalPromise({
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        title: title,
        description:
          'Before you delete, keep the following points in mind to understand how to protect your assets.',
        checklist: [
          'I understand that if I delete this address, the corresponding Private Key & Seed Phrase of this address will be deleted and Rabby will NOT be able to recover it.',
          "I confirm that I have backuped the private key or Seed Phrase and I'm ready to delete it now.",
        ],
        async onFinished() {
          await onFinished();
        },
        onCancel() {
          onCancel?.();
        },
        wallet,
      });
    },
    [wallet]
  );

  const handleOpenDeleteModal = useCallback(
    async (list: IDisplayedAccountWithBalance[], deleteGroup = true) => {
      setDeleteList(list);
      setDeleteGroup(deleteGroup);

      if (list?.[0].type === KEYRING_TYPE['SimpleKeyring']) {
        const count = list.length;
        const title = `Delete ${count} private key ${
          count > 1 ? 'addresses' : 'address'
        }`;

        await AuthenticationDeleteModalPromise(title, async () => {
          if (list.length) {
            await Promise.all(
              list.map(
                async (e) =>
                  await wallet.removeAddress(
                    e.address,
                    e.type,
                    e.brandName,
                    true
                  )
              )
            );
          }

          await dispatch.accountToDisplay.getAllAccountsToDisplay();
          if (deleteGroup && types && types.length - 1 <= activeIndex) {
            setActiveIndex(activeIndex - 1);
          }
        });
        return;
      }

      setOpen(true);
    },
    [
      AuthenticationDeleteModalPromise,
      types,
      activeIndex,
      wallet?.removeAddress,
      dispatch?.accountToDisplay?.getAllAccountsToDisplay,
    ]
  );

  const handleDeleteSeedPhraseGroup = async (
    deleteSeedPhraseGroup: boolean
  ) => {
    setSeedPhraseDeleteOpen(false);
    if (!deleteSeedPhraseGroup && types) {
      handleOpenDeleteModal(types[activeIndex].list, false);
      return;
    }

    const count = types?.[activeIndex].list?.length || 0;
    const title = `Delete seed phrase and its ${count} ${
      count > 1 ? 'addresses' : 'address'
    }`;
    await AuthenticationDeleteModalPromise(title, async () => {
      if (types && types?.[activeIndex]?.list?.length) {
        await Promise.all(
          types?.[activeIndex]?.list?.map((e) =>
            wallet.removeAddress(
              e.address,
              e.type,
              e.brandName,
              deleteSeedPhraseGroup
            )
          )
        );
      }

      await dispatch.accountToDisplay.getAllAccountsToDisplay();
      if (deleteSeedPhraseGroup && types && types.length - 1 <= activeIndex) {
        setActiveIndex(activeIndex - 1);
      }
    });
  };

  // @ts-expect-error 123123
  window.getAllAccountsToDisplay =
    dispatch.accountToDisplay.getAllAccountsToDisplay;

  const Row = (props) => {
    const { data, index, style } = props;
    const account = data[index];
    const favorited = highlightedAddresses.some(
      (highlighted) =>
        account.address === highlighted.address &&
        account.brandName === highlighted.brandName
    );

    const onDelete = React.useMemo(() => {
      if (
        [KEYRING_TYPE['HdKeyring'], KEYRING_TYPE['SimpleKeyring']].includes(
          account.type
        )
      ) {
        return () => {
          handleOpenDeleteModal([account], false);
        };
      }

      return undefined;
    }, [account, KEYRING_TYPE['HdKeyring']]);

    return (
      <div className="address-wrap-with-padding px-[20px]" style={style}>
        <AddressItem
          balance={account.balance}
          address={account.address}
          type={account.type}
          brandName={account.brandName}
          alias={account.alianName}
          onDelete={onDelete}
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

  if (activeIndex < 0) {
    history.replace('/add-address');
    return null;
  }

  return (
    <div className="page-address-management px-0 pb-0 bg-[#F0F2F5] overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="px-20">
          <PageHeader className="pt-[24px]">Manage Address</PageHeader>
          <div className="rounded-[6px] bg-white flex flex-wrap p-[3px]">
            {types?.map((items, index) => (
              <GroupItem
                item={items.list[0]}
                active={index === activeIndex}
                count={items.list.length}
                onChange={() => {
                  setActiveIndex(index);
                }}
                type={items.type}
                brandName={items.brandName}
              />
            ))}
          </div>
          {types?.length ? (
            <div className="flex items-center justify-between mt-20">
              <div>{types?.[activeIndex]?.name}</div>
              <div className="flex items-center gap-16">
                {isSeedPhrase && (
                  <IconShowSeedPhrase
                    className="cursor-pointer"
                    onClick={() => {
                      if (types?.[activeIndex]?.publicKey) {
                        backup(types[activeIndex].publicKey!);
                      }
                    }}
                  />
                )}
                <IconDelete
                  className="cursor-pointer"
                  onClick={() => {
                    if (
                      types?.[activeIndex]?.type === KEYRING_TYPE['HdKeyring']
                    ) {
                      setSeedPhraseDeleteOpen(true);
                      return;
                    }
                    handleOpenDeleteModal(types?.[activeIndex]?.list);
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {types?.[activeIndex]?.list.length ? (
          <>
            <VList
              height={450}
              width="100%"
              itemData={types?.[activeIndex].list}
              itemCount={types?.[activeIndex].list.length}
              itemSize={() => 64}
              className="w-auto"
            >
              {Row}
            </VList>
          </>
        ) : null}

        {types?.[activeIndex].type === KEYRING_TYPE['HdKeyring'] &&
        !types?.[activeIndex]?.list.length ? (
          <div className="flex-1 flex flex-col items-center justify-around">
            <Empty
              desc={
                <div className="text-gray-content text-14 max-w-[352px] mt-12">
                  Your seed phrase is not deleted. You can choose to delete the
                  seed phrase or add address again{' '}
                </div>
              }
            />
            <div>
              <Button
                type="primary"
                className="flex items-center gap-4"
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8.02001 3.33594L8.00781 12.6693"
                      stroke="white"
                      stroke-width="1.33333"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M3.33594 8H12.6693"
                      stroke="white"
                      stroke-width="1.33333"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                }
                onClick={async () => {
                  if (types?.[activeIndex]?.publicKey) {
                    const keyringId = wallet.getMnemonicKeyRingIdFromPublicKey(
                      types[activeIndex].publicKey!
                    );
                    openInternalPageInTab(
                      `import/select-address?hd=${KEYRING_CLASS.MNEMONIC}&keyringId=${keyringId}`
                    );
                  }
                }}
              >
                Add address
              </Button>
              <div
                className="mt-20 cursor-pointer underline text-gray-content text-14 text-center"
                onClick={async () => {
                  await AuthenticationDeleteModalPromise(
                    'Delete seed phrase and its 0 address',

                    async () => {
                      if (types?.[activeIndex]?.publicKey) {
                        await wallet.removeMnemonicsKeyRingByPublicKey(
                          types[activeIndex].publicKey!
                        );

                        if (types.length - 1 <= activeIndex) {
                          setActiveIndex(activeIndex - 1);
                        }
                        dispatch.accountToDisplay.getAllAccountsToDisplay();
                      }
                    }
                  );
                }}
              >
                Delete seed phrase
              </div>
            </div>
          </div>
        ) : null}

        {types && deleteList.length ? (
          <AddressDeleteModal
            visible={open}
            onClose={() => setOpen(false)}
            onSubmit={async () => {
              if (deleteList.length) {
                await Promise.all(
                  deleteList.map(
                    async (e) =>
                      await wallet.removeAddress(
                        e.address,
                        e.type,
                        e.brandName,
                        false
                      )
                  )
                );
              }
              await dispatch.accountToDisplay.getAllAccountsToDisplay();

              if (deleteGroup && types.length - 1 <= activeIndex) {
                setActiveIndex(activeIndex - 1);
              }
              setOpen(false);
              message.success({
                icon: <img src={IconSuccess} className="icon icon-success" />,
                content: 'Deleted',
                duration: 0.5,
              });
            }}
            item={deleteList[0]}
            count={deleteList.length || 0}
          />
        ) : null}
      </div>

      <SeedPhraseDeleteModal
        visible={seedPhraseDeleteOpen}
        onClose={function (): void {
          setSeedPhraseDeleteOpen(false);
        }}
        onSubmit={handleDeleteSeedPhraseGroup}
      />
    </div>
  );
};

export default ManageAddress;
function handleDeleteAddress() {
  throw new Error('Function not implemented.');
}
