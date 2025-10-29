import Tooltip, { TooltipProps } from 'antd/es/tooltip';
import cx from 'clsx';
import React, { ReactNode } from 'react';

export type HelperTooltipProps = {
  children: ReactNode;
  help?: boolean;
  className?: string;
  inParent?: boolean;
  disable?: boolean;
} & TooltipProps;

export const HelperTooltip = ({
  children,
  help,
  className,
  inParent,
  overlayClassName,
  disable,
  title,
  ...rest
}: HelperTooltipProps) => {
  return disable ? (
    <>{children}</>
  ) : (
    <Tooltip
      title={title}
      getTooltipContainer={inParent ? (dom) => dom : undefined}
      overlayClassName={cx('rectangle addressType__tooltip', overlayClassName)}
      className={cx(help && 'toolTipHelp', className)}
      mouseEnterDelay={0}
      {...rest}
    >
      {children}
    </Tooltip>
  );
};

export default HelperTooltip;
