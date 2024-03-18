import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { Empty, PageHeader } from '@/ui/component';
import { useRabbyDispatch } from '@/ui/store';
import React, { useCallback, useState } from 'react';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';
import { ReactComponent as IconPlus } from '@/ui/assets/address/plus.svg';
import { ReactComponent as RcIconShowSeedPhrase } from '@/ui/assets/address/show-seed-phrase.svg';
import { ReactComponent as RcIconDelete } from '@/ui/assets/address/delete-current-color.svg';
import { ReactComponent as RcIconPlusButton } from '@/ui/assets/import/plus.svg';

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
import { LedgerHDPathTypeLabel } from '@/ui/utils/ledger';
import { useTranslation } from 'react-i18next';
import { query2obj } from '@/ui/utils/url';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';

const ManageAddress = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { search } = useLocation();
  const [{ back = false }] = useState<{
    back?: boolean;
  }>(query2obj(search));

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
        confirmText: t('page.manageAddress.confirm'),
        cancelText: t('page.manageAddress.cancel'),
        title: title,
        description: t('page.manageAddress.delete-desc'),
        checklist: [
          t('page.manageAddress.delete-checklist-1'),
          t('page.manageAddress.delete-checklist-2'),
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
        const title = t('page.manageAddress.delete-private-key-modal-title', {
          count,
        });

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
      content: t('page.manageAddress.deleted'),
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
    const title = t('page.manageAddress.delete-seed-phrase-title', {
      count,
    });

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

  const invokeEnterPassphrase = useEnterPassphraseModal('publickey');
  const handleAddSeedPhraseAddress = async () => {
    if (TypedWalletObj?.[activeIndex]?.publicKey) {
      await invokeEnterPassphrase(TypedWalletObj?.[activeIndex]?.publicKey);
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
      t('page.manageAddress.delete-empty-seed-phrase'),

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
  console.log(typedWalletIdList, TypedWalletObj);

  return (
    <div className="page-address-management px-0 pb-0 bg-r-neutral-bg-2 overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="px-20">
          <PageHeader className="pt-[24px]" canBack={back} closeable={!back}>
            {t('page.manageAddress.manage-address')}
          </PageHeader>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="px-20 mb-8">
            <div className="rounded-[6px] bg-r-neutral-card-1 flex flex-wrap p-[3px]">
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
                <div className="text-[17px] text-r-neutral-title-1 font-medium">
                  {TypedWalletObj?.[activeIndex]?.name}
                </div>
                <div className="flex items-center gap-16">
                  {isSeedPhrase && (
                    <RcIconPlusButton
                      onClick={handleAddSeedPhraseAddress}
                      className="cursor-pointer text-r-neutral-body"
                    />
                  )}
                  {isSeedPhrase && (
                    <RcIconShowSeedPhrase
                      className="cursor-pointer text-r-neutral-body"
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
                  <RcIconDelete
                    className="cursor-pointer text-r-neutral-body hover:text-red-forbidden"
                    onClick={() => {
                      if (
                        TypedWalletObj?.[activeIndex]?.type ===
                        KEYRING_TYPE['HdKeyring']
                      ) {
                        setSeedPhraseDeleteOpen(true);
                        return;
                      }
                      handleOpenDeleteModal(
                        TypedWalletObj?.[activeIndex]?.list
                      );
                    }}
                  />
                </div>
              </div>
            ) : null}

            {!!isLedger && !!TypedWalletObj?.[activeIndex]?.hdPathType && (
              <div className="text-r-neutral-body text-12 mb-4">
                {t('page.manageAddress.hd-path')}{' '}
                {LedgerHDPathTypeLabel[TypedWalletObj[activeIndex].hdPathType!]}
              </div>
            )}
          </div>

          <AccountList
            handleOpenDeleteModal={handleOpenDeleteModal}
            list={TypedWalletObj?.[activeIndex]?.list}
            highlightedAddresses={highlightedAddresses}
            updateIndex={updateInfoAndSetCurrentIndex}
          />

          {TypedWalletObj?.[activeIndex]?.type === KEYRING_TYPE['HdKeyring'] &&
          !TypedWalletObj?.[activeIndex]?.list.length ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-[30px] min-h-[300px]">
              <Empty
                desc={
                  <div className="text-r-neutral-body text-14 max-w-[296px] mt-12">
                    {t('page.manageAddress.no-address-under-seed-phrase')}
                  </div>
                }
              />
              <div>
                <Button
                  type="primary"
                  className="w-[140px] h-[36px] rounder-[4px] flex items-center justify-center gap-4 text-13 font-medium"
                  icon={<IconPlus />}
                  onClick={handleAddSeedPhraseAddress}
                >
                  {t('page.manageAddress.add-address')}
                </Button>
                <div
                  className="mt-20 cursor-pointer underline text-r-neutral-body text-14 text-center"
                  onClick={handleDeleteEmptySeedPhrase}
                >
                  {t('page.manageAddress.delete-seed-phrase')}
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
          emptyAddress={TypedWalletObj?.[activeIndex]?.list.length === 0}
        />
      </div>
    </div>
  );
};

export default ManageAddress;
