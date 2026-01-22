import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { GnosisQueue } from '@/ui/views/GnosisQueue';
import { Modal, ModalProps } from 'antd';
import React from 'react';

export const GnosisQueueModal: React.FC<ModalProps> = (props) => {
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
        <GnosisQueue isInModal onClose={props.onCancel} />
      </PopupContainer>
    </Modal>
  );
};
