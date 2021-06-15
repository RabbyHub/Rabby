import React from 'react';
import { Modal } from 'antd';
import { IconCross } from 'ui/assets';

const CustomModal = (props) => (
  <Modal
    footer={null}
    centered
    closeIcon={<IconCross className="w-14 fill-current text-gray-content" />}
    {...props}
  />
);

export default CustomModal;
