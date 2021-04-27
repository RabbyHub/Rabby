import React, { forwardRef } from 'react';
import cx from 'clsx';

interface CompoundedComponent extends React.ForwardRefExoticComponent<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & React.RefAttributes<HTMLInputElement>> {
  Textarea: typeof Textarea
}

const Input = forwardRef<HTMLInputElement, React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>>(({ className, ...restProps }, ref) => {
  const baseClassName = 'w-full border border-gray rounded py-1 px-2';

  return (
    <input type="text" ref={ref} className={cx(baseClassName, className)} {...restProps} />
  );
}) as CompoundedComponent;

const Textarea = forwardRef<HTMLTextAreaElement, React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>>(({ rows = 4, className, ...restProps }, ref) => {
  const baseClassName = 'w-full border border-gray rounded py-1 px-2';

  return (
    <textarea ref={ref} className={cx(baseClassName, className)} rows={rows} {...restProps} />
  )
});

Input.Textarea = Textarea

export default Input;
