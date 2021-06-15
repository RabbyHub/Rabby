import React from 'react';
import { Modal } from 'antd';
import { SvgIconCross } from 'ui/assets';

const CustomModal = (props) => (
  <Modal
    footer={null}
    centered
    closeIcon={<SvgIconCross className="w-14 fill-current text-gray-content" />}
    {...props}
  />
);

export default CustomModal;
