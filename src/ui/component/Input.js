import cx from 'clsx';

const Input = ({ className, ...restProps }) => {
  const baseClassName = 'w-full border border-gray rounded py-1 px-2';

  return (
    <input type="text" className={cx(baseClassName, className)} {...restProps} />
  );
}

Input.Textarea = ({ rows = 4, className, ...restProps }) => {
  const baseClassName = 'w-full border border-gray rounded py-1 px-2';

  return (
    <textarea className={cx(baseClassName, className)} rows={rows} {...restProps} />
  )
}

export default Input;
