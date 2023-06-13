import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { Empty, PageHeader } from '@/ui/component';
import { useRabbyDispatch } from '@/ui/store';
import React, { useCallback, useState } from 'react';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';
import { ReactComponent as IconShowSeedPhrase } from '@/ui/assets/address/show-seed-phrase.svg';
import { ReactComponent as IconDelete } from '@/ui/assets/address/delete-current-color.svg';
import { ReactComponent as IconPlus } from '@/ui/assets/address/plus.svg';

import { openInternalPageInTab, useWallet } from '@/ui/utils';

import { useHistory, useLocation } from 'react-router-dom';
import AuthenticationModalPromise from '@/ui/component/AuthenticationModal';
import { AddressDeleteModal } from './AddressDeleteModal';
import { Button, message } from 'antd';
import IconSuccess from '@/ui/assets/success.svg';
import { GroupItem } from './GroupItem';
import { useBackUp, useWalletTypeData } from './hooks';
import { SeedPhraseDeleteModal } from './SeedPhraseDelete';
import { AccountList } from './List';
import { LedgerHDPathTypeLabel } from '@/utils/ledger';

const ManageAddress = () => {
  const history = useHistory();

  const wallet = useWallet();

  const dispatch = useRabbyDispatch();

  const location = useLocation();

  const [currentIndex, setCurrentIndex] = useState(() => {
    const searchParams = new URLSearchParams(location.search);
    return Number(searchParams.get('index') || 0);
  });

  const { accountGroup, highlightedAddresses } = useWalletTypeData();

  const [TypedWalletObj, typedWalletIdList = []] = accountGroup || [];

  const activeIndex = typedWalletIdList[currentIndex];

  const isSeedPhrase =
    TypedWalletObj?.[activeIndex]?.type === KEYRING_TYPE['HdKeyring'];

  const isLedger =
    TypedWalletObj?.[activeIndex]?.type === KEYRING_CLASS.HARDWARE.LEDGER;

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

  const updateInfoAndSetCurrentIndex = useCallback(
    async (cond = true) => {
      await dispatch.accountToDisplay.getAllAccountsToDisplay();
      setCurrentIndex((pre) => {
        if (cond && TypedWalletObj && typedWalletIdList.length - 1 <= pre) {
          setCurrentIndex(pre - 1);
        }
        return pre;
      });
    },
    [typedWalletIdList, dispatch?.accountToDisplay?.getAllAccountsToDisplay]
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

          updateInfoAndSetCurrentIndex(deleteGroup);
        });
        return;
      }

      setOpen(true);
    },
    [
      AuthenticationDeleteModalPromise,
      wallet?.removeAddress,
      updateInfoAndSetCurrentIndex,
    ]
  );

  const handleConfirmDeleteAddress = async () => {
    if (deleteList.length) {
      await Promise.all(
        deleteList.map(
          async (e) =>
            await wallet.removeAddress(e.address, e.type, e.brandName, false)
        )
      );
    }

    await updateInfoAndSetCurrentIndex(deleteGroup);

    setOpen(false);
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: 'Deleted',
      duration: 0.5,
    });
  };

  const handleOpenDeleteSeedPhraseModal = async (
    deleteSeedPhraseGroup: boolean
  ) => {
    setSeedPhraseDeleteOpen(false);
    if (!deleteSeedPhraseGroup && TypedWalletObj) {
      handleOpenDeleteModal(TypedWalletObj[activeIndex].list, false);
      return;
    }

    const count = TypedWalletObj?.[activeIndex].list?.length || 0;
    const title = `Delete seed phrase and its ${count} ${
      count > 1 ? 'addresses' : 'address'
    }`;
    await AuthenticationDeleteModalPromise(title, async () => {
      if (TypedWalletObj && TypedWalletObj?.[activeIndex]?.list?.length) {
        await Promise.all(
          TypedWalletObj?.[activeIndex]?.list?.map((e) =>
            wallet.removeAddress(
              e.address,
              e.type,
              e.brandName,
              deleteSeedPhraseGroup
            )
          )
        );
      } else if (TypedWalletObj?.[activeIndex]?.publicKey) {
        await wallet.removeMnemonicsKeyRingByPublicKey(
          TypedWalletObj[activeIndex].publicKey!
        );
      }

      await updateInfoAndSetCurrentIndex(deleteSeedPhraseGroup);
    });
  };

  const handleAddSeedPhraseAddress = async () => {
    if (TypedWalletObj?.[activeIndex]?.publicKey) {
      const keyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(
        TypedWalletObj[activeIndex].publicKey!
      );
      openInternalPageInTab(
        `import/select-address?hd=${KEYRING_CLASS.MNEMONIC}&keyringId=${keyringId}`
      );
    }
  };

  const handleDeleteEmptySeedPhrase = async () => {
    await AuthenticationDeleteModalPromise(
      'Delete seed phrase and its 0 address',

      async () => {
        if (TypedWalletObj?.[activeIndex]?.publicKey) {
          await wallet.removeMnemonicsKeyRingByPublicKey(
            TypedWalletObj[activeIndex].publicKey!
          );

          updateInfoAndSetCurrentIndex();
        }
      }
    );
  };

  if (currentIndex < 0) {
    history.replace('/add-address');
    return null;
  }

  return (
    <div className="page-address-management px-0 pb-0 bg-[#F0F2F5] overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="px-20 mb-8">
          <PageHeader className="pt-[24px]">Manage Address</PageHeader>
          <div className="rounded-[6px] bg-white flex flex-wrap p-[3px]">
            {typedWalletIdList?.map((id, i) => {
              const item = TypedWalletObj?.[id];
              const list = item?.list;
              if (!item) {
                return null;
              }
              return (
                <GroupItem
                  item={list?.[0]}
                  active={i === currentIndex}
                  count={list?.length || 0}
                  onChange={() => {
                    setCurrentIndex(i);
                  }}
                  type={item?.type}
                  brandName={item?.brandName}
                />
              );
            })}
          </div>
          {TypedWalletObj?.[activeIndex] ? (
            <div className="flex items-center justify-between mt-20 ">
              <div className="text-20 font-medium">
                {TypedWalletObj?.[activeIndex]?.name}
              </div>
              <div className="flex items-center gap-16">
                {isSeedPhrase && (
                  <IconShowSeedPhrase
                    className="cursor-pointer"
                    onClick={() => {
                      if (TypedWalletObj?.[activeIndex]?.publicKey) {
                        backup(
                          TypedWalletObj[activeIndex].publicKey!,
                          currentIndex
                        );
                      }
                    }}
                  />
                )}
                <IconDelete
                  className="cursor-pointer text-gray-content hover:text-red-forbidden"
                  onClick={() => {
                    if (
                      TypedWalletObj?.[activeIndex]?.type ===
                      KEYRING_TYPE['HdKeyring']
                    ) {
                      setSeedPhraseDeleteOpen(true);
                      return;
                    }
                    handleOpenDeleteModal(TypedWalletObj?.[activeIndex]?.list);
                  }}
                />
              </div>
            </div>
          ) : null}

          {!!isLedger && !!TypedWalletObj?.[activeIndex]?.hdPathType && (
            <div className="text-gray-content text-12 mb-4">
              HD path:{' '}
              {LedgerHDPathTypeLabel[TypedWalletObj[activeIndex].hdPathType!]}
            </div>
          )}
        </div>

        <AccountList
          handleOpenDeleteModal={handleOpenDeleteModal}
          list={TypedWalletObj?.[activeIndex]?.list}
          highlightedAddresses={highlightedAddresses}
        />

        {TypedWalletObj?.[activeIndex].type === KEYRING_TYPE['HdKeyring'] &&
        !TypedWalletObj?.[activeIndex]?.list.length ? (
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
                icon={<IconPlus />}
                onClick={handleAddSeedPhraseAddress}
              >
                Add address
              </Button>
              <div
                className="mt-20 cursor-pointer underline text-gray-content text-14 text-center"
                onClick={handleDeleteEmptySeedPhrase}
              >
                Delete seed phrase
              </div>
            </div>
          </div>
        ) : null}

        {TypedWalletObj && deleteList.length ? (
          <AddressDeleteModal
            visible={open}
            onClose={() => setOpen(false)}
            onSubmit={handleConfirmDeleteAddress}
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
        onSubmit={handleOpenDeleteSeedPhraseModal}
      />
    </div>
  );
};

export default ManageAddress;
