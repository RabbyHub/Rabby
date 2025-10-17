import { Modal, ModalProps } from 'antd';
import React from 'react';

export const SwapTokenModal: React.FC<ModalProps> = (props) => {
  return <Modal title="swap" {...props}></Modal>;
};
