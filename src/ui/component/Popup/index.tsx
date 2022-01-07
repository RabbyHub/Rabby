import React, { ReactNode } from 'react';
import { Drawer, DrawerProps } from 'antd';
import cx from 'clsx';
import { SvgIconCross } from 'ui/assets';

import './index.less';
import clsx from 'clsx';

interface PopupProps extends DrawerProps {
  children: ReactNode;
}

const Popup = ({
  children,
  closable = false,
  placement = 'bottom',
  className,
  ...rest
}: PopupProps) => (
  <Drawer
    closable={closable}
    placement={placement}
    className={clsx('custom-popup', className)}
    {...rest}
  >
    {children}
  </Drawer>
);

export default Popup;
