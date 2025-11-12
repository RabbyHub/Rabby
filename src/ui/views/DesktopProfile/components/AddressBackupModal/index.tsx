import { SvgIconCross } from '@/ui/assets';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import AddressBackupMnemonics from '@/ui/views/AddressBackup/Mnemonics';
import AddressBackupPrivateKey from '@/ui/views/AddressBackup/PrivateKey';
import { Modal, ModalProps } from 'antd';
import React from 'react';
import { useLocation } from 'react-router-dom';

export const AddressBackupModal: React.FC<
  ModalProps & { onCancel?(): void }
> = (props) => {
  const location = useLocation();
  const backupType = new URLSearchParams(location.search).get('backupType');

  return (
    <Modal
      {...props}
      width={400}
      centered
      closable
      closeIcon={
        <SvgIconCross className="w-[14px] fill-current text-r-neutral-title-2" />
      }
      className="modal-support-darkmode"
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
      <PopupContainer>
        {backupType === 'private-key' ? (
          <AddressBackupPrivateKey isInModal onClose={props.onCancel} />
        ) : backupType === 'mneonics' ? (
          <AddressBackupMnemonics isInModal onClose={props.onCancel} />
        ) : null}
      </PopupContainer>
    </Modal>
  );
};
