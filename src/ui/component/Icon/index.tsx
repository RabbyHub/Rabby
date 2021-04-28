import React from 'react';
import cx from 'clsx';

import './index.css';

interface IconProps {
  type: string,
  className?: string,
  onClick?: React.MouseEventHandler<HTMLElement>
}

const Icon = ({ type, className, ...restProps }: IconProps) => {
  return (
    <span
      className={cx('icon', `icon-${type}`, className)}
      {...restProps}
    />
  );
}

export default Icon;
