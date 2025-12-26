import { Button, DrawerProps, message } from 'antd';
import { isSameAddress, useWallet } from '../utils';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '../store';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import {
  ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import React from 'react';
import IconSuccess from 'ui/assets/success.svg';
import { Item, Popup } from '../component';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import clsx from 'clsx';

const AddressHdKeyringOrSimpleKeyringDelete = ({
  type,
  address,
  brandName,
  onFinished,
  getContainer,
}: {
  type: string;
  address: string;
  brandName?: string;
  onFinished?: () => void;
  getContainer?: DrawerProps['getContainer'];
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const accountsList = useRabbySelector((s) => s.accountToDisplay.accountsList);

  const targetAccount = accountsList?.find(
    (e) => isSameAddress(address, e.address) && e.type === type
  );

  const isHDKeyring = type === KEYRING_TYPE.HdKeyring;

  const isLastHdKeyingAccount = useMemo(
    () =>
      !!targetAccount &&
      isHDKeyring &&
      accountsList.filter((e) => e.publicKey === targetAccount.publicKey)
        .length === 1,
    [targetAccount, accountsList, isHDKeyring]
  );

  const [deleteHDKeyringPopup, setDeleteHDKeyringPopup] = useState(true);
  const [HdKeyringDeletedType, setHdKeyringDeletedType] = useState<
    'seed' | 'addr' | undefined
  >(undefined);

  const handleDeleteAddress = async (deleteSeed = false) => {
    await wallet.removeAddress(
      address,
      type,
      brandName,
      type === KEYRING_TYPE.HdKeyring ? (deleteSeed ? true : false) : true
    );
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('global.Deleted'),
      duration: 0.5,
    });
    onFinished?.();
    closeDeleteHDKeyringPopup();
  };

  const closeDeleteHDKeyringPopup = () => {
    setDeleteHDKeyringPopup(false);
  };

  useEffect(() => {
    setHdKeyringDeletedType(undefined);
  }, [deleteHDKeyringPopup]);

  const renderContent = () => {
    if (isHDKeyring) {
      if (isLastHdKeyingAccount) {
        if (!HdKeyringDeletedType) {
          return (
            <div>
              <div className="text-r-neutral-body text-[14px] text-center">
                {t('page.addressDetail.deleteSeedPhrase.keepSeedPhrase')}
              </div>
              <div className="flex flex-col gap-12 mt-20 text-r-neutral-title1">
                <Item
                  bgColor={'var(--r-neutral-card1, #ffffff)'}
                  onClick={() => {
                    setHdKeyringDeletedType('addr');
                  }}
                >
                  {t('page.addressDetail.deleteSeedPhrase.option1')}
                </Item>
                <Item
                  bgColor={'var(--r-neutral-card1, #ffffff)'}
                  onClick={async () => {
                    closeDeleteHDKeyringPopup();
                    await AuthenticationModalPromise({
                      confirmText: t('global.Confirm'),
                      cancelText: t('global.Cancel'),
                      title: t('page.addressDetail.deleteSeedPhrase.title'),
                      description: t(
                        'page.addressDetail.deleteSeedPhrase.sub-title'
                      ),
                      checklist: [
                        t('page.addressDetail.deleteSeedPhrase.check1'),
                        t('page.addressDetail.deleteSeedPhrase.check2'),
                      ],
                      onFinished() {
                        handleDeleteAddress(true);
                      },
                      onCancel() {
                        // do nothing
                      },
                      getContainer,
                      wallet,
                    });
                  }}
                >
                  {t('page.addressDetail.deleteSeedPhrase.option2')}
                </Item>
              </div>
            </div>
          );
        }

        if (HdKeyringDeletedType === 'addr') {
          return (
            <div>
              <div className="text-r-neutral-body text-[14px] text-center">
                {t('page.addressDetail.deleteSeedPhrase.remainSeedPhrase')}
              </div>
              <div
                className={clsx(
                  'flex pt-20 px-20 gap-16 mx-[-20px] mt-[64px]',
                  'justify-between',
                  'border-t border-solid border-rabby-neutral-line'
                )}
              >
                <Button
                  size="large"
                  type="primary"
                  className="flex-1 rabby-btn-ghost"
                  ghost
                  onClick={closeDeleteHDKeyringPopup}
                >
                  {t('global.Cancel')}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  className="flex-1"
                  onClick={() => handleDeleteAddress()}
                >
                  {t('global.Confirm')}
                </Button>
              </div>
            </div>
          );
        }
        return null;
      }
      return (
        <div>
          <div className="text-[14px] text-r-neutral-body">
            {t('page.addressDetail.deleteSeedPhrase.onlyDeleteAddr')}
          </div>
          <div
            className={clsx(
              'flex pt-20 px-20 gap-16 mx-[-20px] mt-[30px]',
              'justify-between',
              'border-t border-solid border-rabby-neutral-line'
            )}
          >
            <Button
              size="large"
              type="primary"
              className="flex-1 rabby-btn-ghost"
              ghost
              onClick={closeDeleteHDKeyringPopup}
            >
              {t('global.Cancel')}
            </Button>
            <Button
              type="primary"
              size="large"
              className="flex-1"
              onClick={() => handleDeleteAddress()}
            >
              {t('global.Confirm')}
            </Button>
          </div>
        </div>
      );
    }
    return null;
  };

  const title = 'Delete Address?';

  return (
    <Popup
      visible={deleteHDKeyringPopup}
      className={clsx('custom-popup is-support-darkmode is-new')}
      getContainer={getContainer}
      title={title}
      onCancel={closeDeleteHDKeyringPopup}
      height={'fit-content'}
      contentWrapperStyle={{
        background: 'var(--r-neutral-bg2, #F2F4F7)',
        borderRadius: 16,
      }}
    >
      {renderContent()}
    </Popup>
  );
};

export const useHandleDeleteHdKeyringAndSimpleKeyringAccount = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [deletedProps, setDeletedProps] = useState<
    | ComponentPropsWithoutRef<typeof AddressHdKeyringOrSimpleKeyringDelete>
    | undefined
  >(undefined);

  const [nonce, setNonce] = useState(0);

  const handleReset = () => {
    setDeletedProps((e) => undefined);
    setNonce((e) => e + 1);
  };

  const deleteAccount = useCallback(
    async (params: typeof deletedProps) => {
      if (params?.type === KEYRING_CLASS.PRIVATE_KEY) {
        const deletePrivateKeyAccount = async () => {
          await wallet.removeAddress(
            params.address,
            params.type,
            params.brandName,
            params.type === KEYRING_TYPE.HdKeyring ||
              KEYRING_CLASS.HARDWARE.GRIDPLUS ||
              KEYRING_CLASS.HARDWARE.KEYSTONE
              ? false
              : true
          );
          message.success({
            icon: <img src={IconSuccess} className="icon icon-success" />,
            content: t('global.Deleted'),
            duration: 0.5,
          });
        };
        await AuthenticationModalPromise({
          confirmText: t('global.Confirm'),
          cancelText: t('global.Cancel'),
          title: t('page.addressDetail.deletePrivateKey.title'),
          description: t('page.addressDetail.deletePrivateKey.sub-title'),
          checklist: [
            t('page.addressDetail.deletePrivateKey.check1'),
            t('page.addressDetail.deletePrivateKey.check2'),
          ],
          onFinished() {
            // handleDeleteAddress();
            deletePrivateKeyAccount();
            params.onFinished?.();
          },
          onCancel() {
            // do nothing
          },
          getContainer: params.getContainer,
          wallet,
        });
        return;
      }
      handleReset();
      setDeletedProps(params);
    },
    [wallet?.removeAddress]
  );

  const renderDelete = useCallback(() => {
    if (!deletedProps) {
      return null;
    }
    if (deletedProps?.type !== KEYRING_CLASS.MNEMONIC) {
      return null;
    }

    return (
      <AddressHdKeyringOrSimpleKeyringDelete
        key={nonce}
        {...deletedProps}
        onFinished={() => {
          deletedProps.onFinished?.();
          handleReset();
        }}
      />
    );
  }, [nonce, deletedProps]);

  return {
    renderDelete,
    deleteAccount,
  };
};
