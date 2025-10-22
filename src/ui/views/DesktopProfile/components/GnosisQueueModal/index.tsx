import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { GnosisQueue } from '@/ui/views/GnosisQueue';
import { Modal, ModalProps } from 'antd';
import React from 'react';

export const GnosisQueueModal: React.FC<ModalProps> = (props) => {
  return (
    <Modal
      {...props}
      className="global-desktop-modal"
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
        <GnosisQueue isInModal onClose={props.onCancel} />
      </PopupContainer>
    </Modal>
  );
};
