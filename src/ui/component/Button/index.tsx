import React, { ReactNode } from 'react';
import cx from 'clsx';

import './index.css';

interface ButtonProps {
  children: ReactNode
  type?: 'primary' | 'default' | 'link',
  block?: boolean,
  className?: string,
  size?: 'large' | 'middle' | 'small' | 'xs' | 'sm',
  htmlType?: 'submit' | 'reset' | 'button',
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLElement>
}

function Button({
  children,
  type,
  block,
  className,
  size,
  htmlType = 'button',
  ...restProps
}: ButtonProps) {
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
