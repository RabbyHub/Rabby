import clsx from 'clsx';
import React from 'react';
import { CheckboxCC, CheckboxIndeterminateCC } from 'ui/assets/checkbox';

export const CheckboxV2: React.FC<{
  checked?: boolean;
  indeterminate?: boolean;
  className?: string;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, indeterminate, disabled, onChange, className }) => {
  return (
    <div
      className={clsx(
        'flex items-center justify-center cursor-pointer',
        disabled ? 'cursor-not-allowed opacity-50' : '',
        className
      )}
      onClick={(evt) => {
        if (disabled) {
          return;
        }
        evt.stopPropagation();
        onChange?.(indeterminate ? true : !checked);
      }}
    >
      {indeterminate ? (
        <CheckboxIndeterminateCC className="w-full h-full text-r-blue-default" />
      ) : (
        <CheckboxCC
          className={clsx(
            'w-full h-full',
            checked ? 'text-r-blue-default' : 'text-r-neutral-line'
          )}
        />
      )}
    </div>
  );
};
