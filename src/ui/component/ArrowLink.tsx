import React from 'react';
import { Link } from 'react-router-dom';
import cx from 'clsx';
import { Icon } from 'ui/component';

const ArrowLink = ({ children, className, ...restProps }) => (
  <Link
    className={cx('w-full block flex items-center', className)} {...restProps}
  >
    <div className="flex-1">{children}</div>
    <Icon type="arrow" />
  </Link>
);

export default ArrowLink;
