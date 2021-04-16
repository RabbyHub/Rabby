import cx from 'clsx';

import './index.css';

function Button({
  children,
  type,
  block,
  className,
  size,
  htmlType = 'button',
  ...restProps
}) {
  return (
    <button
      className={cx(
        'btn',
        { 'w-full': block },
        [type && `is-${type}`, size && `is-${size}`],
        className
      )}
      type={htmlType}
      {...restProps}>
      {children}
    </button>
  );
}

export default Button;
