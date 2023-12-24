import React from 'react';
import { Modal } from 'antd';
import cx from 'clsx';
import { SvgIconCross } from 'ui/assets';

import './index.less';

const closeIcon = (
  <SvgIconCross className="w-14 fill-current text-r-neutral-foot" />
);

const CustomModal = (props) => (
  <Modal
    width="360px"
    footer={null}
    centered
    closeIcon={closeIcon}
    {...props}
  />
);

const info = ({ className, ...rest }) =>
  Modal.info({
    maskClosable: true,
    closeIcon,
    closable: true,
    width: '360px',
    className: cx('custome-modal', className),
    ...rest,
  });

CustomModal.info = info;

export default CustomModal;
