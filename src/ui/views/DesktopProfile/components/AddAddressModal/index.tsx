import { SvgIconCross } from '@/ui/assets';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
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
import { Modal, ModalProps } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useLocation } from 'react-router-dom';

export const AddAddressModal: React.FC<ModalProps & { onCancel?(): void }> = (
  props
) => {
  const location = useLocation();
  const importType = new URLSearchParams(location.search).get('import');
  return (
    <Modal
      {...props}
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
  const location = useLocation();
  const importType = new URLSearchParams(location.search).get('import');

  return (
    <PopupContainer>
      {importType === 'add-from-current-seed-phrase' ? (
        <AddFromCurrentSeedPhrase isInModal />
      ) : importType === 'key' ? (
        <ImportPrivateKey isInModal />
      ) : importType === 'json' ? (
        <ImportJson isInModal />
      ) : importType === 'metamask' ? (
        <ImportMyMetaMaskAccount isInModal />
      ) : importType === 'watch-address' ? (
        <ImportWatchAddress isInModal />
      ) : importType === 'wallet-connect' ? (
        <WalletConnectTemplate isInModal />
      ) : importType === 'coinbase' ? (
        <ImportCoinbase isInModal />
      ) : importType === 'gnosis' ? (
        <ImportGnosisAddress isInModal />
      ) : importType === 'cobo-argus' ? (
        <ImportCoboArgus isInModal />
      ) : importType === 'success' ? (
        <ImportSuccess isPopup isInModal />
      ) : (
        <AddAddress isInModal />
      )}
    </PopupContainer>
  );
};
