import React, { ReactNode } from 'react';
import cx from 'clsx';
import { Spin, SpinProps as AntdSpinProps } from 'antd';
import { SvgIconSpin } from 'ui/assets';

interface SpinProps {
  children?: ReactNode;
  spinning?: boolean;
  className?: string;
  iconClassName?: string;
  size?: AntdSpinProps['size'];
}

export default ({
  children,
  spinning = true,
  className,
  size = 'default',
  iconClassName,
}: SpinProps) => {
  return (
    <Spin
      indicator={
        <SvgIconSpin
          className={cx(
            'animate-spin',
            {
              'w-14 h-14': size === 'small',
              'w-24 h-24': size === 'default',
              'w-40 h-40': size === 'large',
            },
            'stroke-current text-bg-content',
            iconClassName
          )}
        />
      }
      spinning={spinning}
      wrapperClassName={className}
      size={size}
    >
      {children}
    </Spin>
  );
};
