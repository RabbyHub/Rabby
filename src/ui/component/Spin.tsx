import React, { ReactNode } from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

interface SpinProps {
  children?: ReactNode;
  spinning: boolean;
}

export default ({ children, spinning }: SpinProps) => {
  return (
    <Spin indicator={antIcon} spinning={spinning}>
      {children}
    </Spin>
  );
};
