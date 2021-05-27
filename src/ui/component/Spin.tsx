import React, { ReactNode } from 'react';
import { Spin, SpinProps as AntdSpinProps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const antIcon = <LoadingOutlined style={{ fontSize: 14 }} spin />;

interface SpinProps {
  children?: ReactNode;
  spinning?: boolean;
  className?: string;
  size?: AntdSpinProps['size'];
}

export default ({ children, spinning = true, className, size }: SpinProps) => {
  return (
    <Spin
      indicator={antIcon}
      spinning={spinning}
      wrapperClassName={className}
      size={size}
    >
      {children}
    </Spin>
  );
};
