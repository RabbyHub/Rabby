import { SvgIconCross } from '@/ui/assets';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import AddAddress from '@/ui/views/AddAddress';
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
  return (
    <Modal
      visible={state.visible}
      onCancel={() => {
        dispatch.desktopProfile.setField({
          addAddress: { visible: false, importType: '' },
        });
      }}
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
