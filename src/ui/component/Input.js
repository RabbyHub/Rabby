import { forwardRef } from 'react';
import cx from 'clsx';

const Input = forwardRef(({ className, ...restProps }, ref) => {
  const baseClassName = 'w-full border border-gray rounded py-1 px-2';

  return (
    <input type="text" ref={ref} className={cx(baseClassName, className)} {...restProps} />
  );
});

Input.Textarea = forwardRef(({ rows = 4, className, ...restProps }, ref) => {
  const baseClassName = 'w-full border border-gray rounded py-1 px-2';

  return (
    <textarea ref={ref} className={cx(baseClassName, className)} rows={rows} {...restProps} />
  )
});

export default Input;
