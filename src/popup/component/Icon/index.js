import cx from 'clsx';

import './index.css';

const Icon = ({ type, className, ...restProps }) => {
  return (
    <span
      className={cx('icon', `icon-${type}`, className)}
      {...restProps}
    />
  );
}

export default Icon;
