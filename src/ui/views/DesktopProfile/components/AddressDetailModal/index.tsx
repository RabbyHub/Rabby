import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import AddressDetail from '@/ui/views/AddressDetail';
import { Modal, ModalProps } from 'antd';
import React from 'react';
import { ModalCloseIcon } from '../TokenDetailModal';

// fix: wallet connect popup style
import '@/ui/views/WalletConnect/style.less';

export const AddressDetailModal: React.FC<ModalProps> = (props) => {
  return (
    <Modal
      {...props}
      width={400}
      centered
      closable
      closeIcon={ModalCloseIcon}
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
        <AddressDetail isInModal />
      </PopupContainer>
    </Modal>
  );
};
