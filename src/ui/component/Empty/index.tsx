import clsx from 'clsx';
import React, { ReactNode } from 'react';
import './style.less';

interface EmptyProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}

const Empty = ({ className, style, children }: EmptyProps) => {
  return (
    <div className={clsx('rabby-empty', className)} style={style}>
      <img className="rabby-empty-image" src="./images/nodata-tx.png" />
      <div className="rabby-empty-content">{children}</div>
    </div>
  );
};

export default Empty;
