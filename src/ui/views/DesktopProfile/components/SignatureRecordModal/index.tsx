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
      <Activities isInModal onClose={props.onCancel} />
    </Modal>
  );
};
