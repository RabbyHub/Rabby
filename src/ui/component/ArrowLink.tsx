import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import cx from 'clsx';
import { Icon } from 'ui/component';

const ArrowLink = ({ children, className, to, ...restProps }: LinkProps) => (
  <Link
    className={cx('w-full flex items-center', className)}
    to={to}
    {...restProps}
  >
    <div className="flex-1">{children}</div>
    <Icon type="arrow" />
  </Link>
);

export default ArrowLink;
