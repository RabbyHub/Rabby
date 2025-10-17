import { Modal, ModalProps } from 'antd';
import React from 'react';

export const SendTokenModal: React.FC<ModalProps> = (props) => {
  return <Modal title="send" {...props}></Modal>;
};
