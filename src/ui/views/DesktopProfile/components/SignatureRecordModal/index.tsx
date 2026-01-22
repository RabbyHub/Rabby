import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import Activities from '@/ui/views/Activities';
import { Modal, ModalProps } from 'antd';
import React from 'react';

export const SignatureRecordModal: React.FC<ModalProps> = (props) => {
  return (
    <Modal
      {...props}
      width={400}
      centered
      closable={false}
      footer={null}
      bodyStyle={{
        maxHeight: 'unset',
        padding: 0,
      }}
      maskStyle={{
        background: 'rgba(0, 0, 0, 0.30)',
        backdropFilter: 'blur(8px)',
      }}
      className="modal-support-darkmode"
    >
      <PopupContainer>
        <Activities isInModal onClose={props.onCancel} />
      </PopupContainer>
    </Modal>
  );
};
