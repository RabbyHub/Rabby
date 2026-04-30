import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { PageHeader } from '@/ui/component';
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
import { Button, message, Spin } from 'antd';
import IconSuccess from '@/ui/assets/success.svg';
import { GroupItem } from './GroupItem';
import { useBackUp, useWalletTypeData } from './hooks';
import { SeedPhraseDeleteModal } from './SeedPhraseDelete';
import { AccountList } from './List';
import { LedgerHDPathTypeLabel } from '@/ui/utils/ledger';
import { useTranslation } from 'react-i18next';
import { query2obj } from '@/ui/utils/url';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { ReactComponent as RcIconEmpty } from '@/ui/assets/empty-cc.svg';
import styled from 'styled-components';
import {
  isWalletUnlockCancelled,
  verifyPasswordOrUnlock,
} from '@/ui/utils/walletUnlock';

const SpinWrapper = styled.div`
  .ant-spin-container {
    height: 100%;
  }
`;

const buildRemoveAddressPayload = (
  item: IDisplayedAccountWithBalance,
  removeEmptyKeyrings: boolean
) =>
  [item.address, item.type, item.brandName, removeEmptyKeyrings] as [
    string,
    string,
    string | undefined,
    boolean
  ];

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
  const [batchDeleting, setBatchDeleting] = useState(false);

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
        validationHandler: async (password: string) => {
          await verifyPasswordOrUnlock({ wallet, password });
        },
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
          setBatchDeleting(true);
          try {
            if (list.length) {
              await wallet.removeAddresses(
                list.map((item) => buildRemoveAddressPayload(item, true))
              );
            }

            await updateInfoAndSetCurrentIndex(deleteGroup);
            message.success({
              icon: <img src={IconSuccess} className="icon icon-success" />,
              content: t('page.manageAddress.deleteSuccess'),
              duration: 0.5,
            });
          } finally {
            setBatchDeleting(false);
          }
        });
        return;
      }

      setOpen(true);
    },
    [
      AuthenticationDeleteModalPromise,
      wallet?.removeAddresses,
      updateInfoAndSetCurrentIndex,
    ]
  );

  const handleConfirmDeleteAddress = async () => {
    setBatchDeleting(true);
    try {
      if (deleteList.length) {
        await wallet.removeAddresses(
          deleteList.map((item) => buildRemoveAddressPayload(item, false))
        );
      }

      await updateInfoAndSetCurrentIndex(deleteGroup);

      setOpen(false);
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('page.manageAddress.deleteSuccess'),
        duration: 0.5,
      });
    } catch (error) {
      if (isWalletUnlockCancelled(error)) {
        return;
      }
      throw error;
    } finally {
      setBatchDeleting(false);
    }
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
      setBatchDeleting(true);
      try {
        if (TypedWalletObj && TypedWalletObj?.[activeIndex]?.list?.length) {
          await wallet.removeAddresses(
            TypedWalletObj[activeIndex].list.map((item) =>
              buildRemoveAddressPayload(item, deleteSeedPhraseGroup)
            )
          );
        } else if (TypedWalletObj?.[activeIndex]?.publicKey) {
          await wallet.removeMnemonicsKeyRingByPublicKey(
            TypedWalletObj[activeIndex].publicKey!
          );
        }

        await updateInfoAndSetCurrentIndex(deleteSeedPhraseGroup);
        message.success({
          icon: <img src={IconSuccess} className="icon icon-success" />,
          content: t('page.manageAddress.deleteSuccess'),
          duration: 0.5,
        });
      } finally {
        setBatchDeleting(false);
      }
    });
  };

  const invokeEnterPassphrase = useEnterPassphraseModal('publickey');
  const handleAddSeedPhraseAddress = async () => {
    if (TypedWalletObj?.[activeIndex]?.publicKey) {
      try {
        await invokeEnterPassphrase(TypedWalletObj?.[activeIndex]?.publicKey);
        const keyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(
          TypedWalletObj[activeIndex].publicKey!
        );
        openInternalPageInTab(
          `import/select-address?hd=${KEYRING_CLASS.MNEMONIC}&keyringId=${keyringId}`
        );
      } catch (error) {
        if (isWalletUnlockCancelled(error)) {
          return;
        }
        throw error;
      }
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
    history.replace('/no-address');
    return null;
  }

  return (
    <div className="page-address-management px-0 pb-0 bg-r-neutral-bg-2 overflow-hidden">
      <SpinWrapper className="h-full">
        <Spin
          spinning={batchDeleting}
          className="h-full"
          wrapperClassName="h-full"
        >
          <div className="h-full flex flex-col">
            <div className="px-20">
              <PageHeader
                className="pt-[24px]"
                canBack={back}
                closeable={!back}
              >
                {t('page.manageAddress.manage-address')}
              </PageHeader>
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
                    {
                      LedgerHDPathTypeLabel[
                        TypedWalletObj[activeIndex].hdPathType!
                      ]
                    }
                  </div>
                )}
              </div>

              <AccountList
                handleOpenDeleteModal={handleOpenDeleteModal}
                list={TypedWalletObj?.[activeIndex]?.list}
                highlightedAddresses={highlightedAddresses}
                updateIndex={updateInfoAndSetCurrentIndex}
              />

              {TypedWalletObj?.[activeIndex]?.type ===
                KEYRING_TYPE['HdKeyring'] &&
              !TypedWalletObj?.[activeIndex]?.list.length ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-[24px] min-h-[300px]">
                  <div className="flex flex-col justify-center items-center gap-[12px]">
                    <RcIconEmpty
                      viewBox="0 0 40 40"
                      className="w-[28px] h-[28px] text-r-neutral-body"
                    />
                    <div className="text-r-neutral-body text-[13px] max-w-[352px] text-center">
                      {t('page.manageAddress.noSeedPhraseAddress')}
                    </div>
                  </div>

                  <div>
                    <Button
                      type="primary"
                      className="w-[186px] h-[44px] rounder-[4px] flex items-center justify-center gap-4 text-15 font-medium"
                      icon={<IconPlus />}
                      onClick={handleAddSeedPhraseAddress}
                    >
                      {t('page.manageAddress.add-address')}
                    </Button>
                    <Button
                      type="ghost"
                      className="w-[186px] h-[44px] rounder-[4px] mt-12 text-r-red-default text-15 font-medium  border-rabby-red-default"
                      onClick={handleDeleteEmptySeedPhrase}
                    >
                      {t('page.manageAddress.delete-seed-phrase')}
                    </Button>
                  </div>
                </div>
              ) : null}

              {TypedWalletObj && deleteList.length ? (
                <AddressDeleteModal
                  visible={open}
                  onClose={() => setOpen(false)}
                  onSubmit={handleConfirmDeleteAddress}
                  loading={batchDeleting}
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
        </Spin>
      </SpinWrapper>
    </div>
  );
};

export default ManageAddress;
