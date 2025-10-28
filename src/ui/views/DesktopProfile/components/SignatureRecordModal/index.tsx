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
    >
      <PopupContainer>
        <Activities isInModal onClose={props.onCancel} />
      </PopupContainer>
    </Modal>
  );
};
