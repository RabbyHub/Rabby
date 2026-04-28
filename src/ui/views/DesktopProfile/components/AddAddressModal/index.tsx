import { SvgIconCross } from '@/ui/assets';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import AddAddress from '@/ui/views/AddAddress';
import { AddMoreAddressesFromSeedPhrase } from '@/ui/views/AddAddress/AddMoreAddressesFromSeedPhrase';
import { AddNewAddress } from '@/ui/views/AddAddress/AddNewAddress';
import { CreateAddressSuccess } from '@/ui/views/AddAddress/CreateAddressSuccess';
import { HardwareWallets } from '@/ui/views/AddAddress/HardwareWallets';
import ImportAddressSuccess from '@/ui/views/AddAddress/ImportAddressSuccess';
import ImportKeyOrSeed from '@/ui/views/AddAddress/ImportKeyOrSeed';
import { InstitutionalWallets } from '@/ui/views/AddAddress/InstitutionalWallets';
import { AddFromCurrentSeedPhrase } from '@/ui/views/AddFromCurrentSeedPhrase';
import { ImportCoboArgus } from '@/ui/views/ImportCoboArgus/ImportCoboArgus';
import { ImportCoinbase } from '@/ui/views/ImportCoinbase/ImportCoinbase';
import ImportGnosisAddress from '@/ui/views/ImportGnosisAddress';
import ImportJson from '@/ui/views/ImportJson';
import { ImportMyMetaMaskAccount } from '@/ui/views/ImportMyMetaMaskAccount';
import ImportPrivateKey from '@/ui/views/ImportPrivateKey';
import ImportSuccess from '@/ui/views/ImportSuccess';
import ImportWatchAddress from '@/ui/views/ImportWatchAddress';
import WalletConnectTemplate from '@/ui/views/WalletConnect';
import { useMemoizedFn } from 'ahooks';
import { Modal, ModalProps } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { EVENTS } from '@/constant';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';

export const AddAddressModal: React.FC = () => {
  const state = useRabbySelector(
    (store) =>
      store.desktopProfile.addAddress || {
        visible: false,
        importType: '',
      }
  );
  const dispatch = useRabbyDispatch();
  const importType = state.importType;
  const closeModal = useMemoizedFn(() => {
    dispatch.desktopProfile.setField({
      addAddress: { visible: false, importType: '' },
    });
  });

  useEventBusListener(EVENTS.LOCK_WALLET, closeModal);

  return (
    <Modal
      visible={state.visible}
      onCancel={closeModal}
      width={400}
      centered
      closable
      className="modal-support-darkmode"
      closeIcon={
        <SvgIconCross
          className={clsx(
            'w-[14px] fill-current',
            importType === 'add-from-current-seed-phrase'
              ? 'text-r-neutral-foot'
              : 'text-r-neutral-title-2'
          )}
        />
      }
      footer={null}
      bodyStyle={{
        maxHeight: 'unset',
        padding: 0,
      }}
      maskStyle={{
        background: 'rgba(0, 0, 0, 0.30)',
        backdropFilter: 'blur(8px)',
      }}
      destroyOnClose
    >
      <AddAddressModalContent />
    </Modal>
  );
};

const AddAddressModalContent: React.FC = () => {
  const { importType, state } = useRabbySelector(
    (store) =>
      store.desktopProfile.addAddress || {
        visible: false,
        importType: '',
      }
  );
  const dispatch = useRabbyDispatch();
  const onNavigate = useMemoizedFn(
    (type: string, state?: Record<string, any>) => {
      dispatch.desktopProfile.setField({
        addAddress: {
          visible: type === 'done' ? false : true,
          importType: type,
          state: state || {},
        },
      });
    }
  );
  const onBack = useMemoizedFn(() => {
    dispatch.desktopProfile.setField({
      addAddress: {
        visible: true,
        importType: '',
        state: {},
      },
    });
  });
  return (
    <PopupContainer>
      {importType === 'add-from-current-seed-phrase' ? (
        <AddFromCurrentSeedPhrase isInModal />
      ) : importType === 'add-new-address' ? (
        <AddNewAddress isInModal onBack={onBack} onNavigate={onNavigate} />
      ) : importType === 'create-address-success' ? (
        <CreateAddressSuccess isInModal onNavigate={onNavigate} state={state} />
      ) : importType === 'import-address-success' ? (
        <ImportAddressSuccess isInModal onNavigate={onNavigate} state={state} />
      ) : importType === 'add-more-from-seed-phrase' ? (
        <AddMoreAddressesFromSeedPhrase
          isInModal
          onNavigate={onNavigate}
          state={state}
        />
      ) : importType === 'import-key-or-seed' ? (
        <ImportKeyOrSeed
          isInModal
          onBack={onBack}
          onNavigate={onNavigate}
          state={state}
        />
      ) : importType === 'hardware-wallets' ? (
        <HardwareWallets isInModal onBack={onBack} onNavigate={onNavigate} />
      ) : importType === 'institutional-wallets' ? (
        <InstitutionalWallets
          isInModal
          onBack={onBack}
          onNavigate={onNavigate}
        />
      ) : importType === 'key' ? (
        <ImportPrivateKey isInModal onBack={onBack} onNavigate={onNavigate} />
      ) : importType === 'json' ? (
        <ImportJson isInModal onBack={onBack} onNavigate={onNavigate} />
      ) : importType === 'metamask' ? (
        <ImportMyMetaMaskAccount
          isInModal
          onBack={onBack}
          onNavigate={onNavigate}
        />
      ) : importType === 'watch-address' ? (
        <ImportWatchAddress isInModal onBack={onBack} onNavigate={onNavigate} />
      ) : importType === 'wallet-connect' ? (
        <WalletConnectTemplate
          isInModal
          onBack={onBack}
          onNavigate={onNavigate}
          state={state}
        />
      ) : importType === 'coinbase' ? (
        <ImportCoinbase isInModal onBack={onBack} onNavigate={onNavigate} />
      ) : importType === 'gnosis' ? (
        <ImportGnosisAddress
          isInModal
          onBack={onBack}
          onNavigate={onNavigate}
        />
      ) : importType === 'cobo-argus' ? (
        <ImportCoboArgus isInModal onBack={onBack} onNavigate={onNavigate} />
      ) : importType === 'success' ? (
        <ImportSuccess
          isPopup
          isInModal
          onBack={onBack}
          onNavigate={onNavigate}
          state={state}
        />
      ) : (
        <AddAddress isInModal onNavigate={onNavigate} />
      )}
    </PopupContainer>
  );
};
