import { Modal, ModalProps } from 'antd';
import React, { useState, useEffect } from 'react';
import Swap from '../../../Swap';
import { Bridge } from '../../../Bridge';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Receive from '../../../Receive';

export const ReceiveTokenModal: React.FC<ModalProps> = (props) => {
  const { t } = useTranslation();
  const { ...modalProps } = props;

  return (
    <Modal
      {...modalProps}
      width={400}
      title={null}
      className="modal-support-darkmode"
      bodyStyle={{
        background: 'transparent',
        maxHeight: '600px',
        height: '600px',
        padding: 0,
      }}
      closable={false}
      maskClosable={true}
      footer={null}
      zIndex={1000}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      }}
    >
      <Receive />
    </Modal>
  );
};
