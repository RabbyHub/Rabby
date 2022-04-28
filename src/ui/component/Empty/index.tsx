import clsx from 'clsx';
import React, { ReactNode } from 'react';
import './style.less';

interface EmptyProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  title?: ReactNode;
  desc?: ReactNode;
}

const Empty = ({ className, style, children, title, desc }: EmptyProps) => {
  return (
    <div className={clsx('rabby-empty', className)} style={style}>
      <img className="rabby-empty-image" src="./images/nodata-tx.png" />
      <div className="rabby-empty-content">
        {title && <div className="rabby-empty-title">{title}</div>}
        <div className="rabby-empty-desc">{children ? children : desc}</div>
      </div>
    </div>
  );
};

export default Empty;
