import React, { useState, useEffect, useRef } from 'react';
import cx from 'clsx';
import { Field, Checkbox } from 'ui/component';

interface FieldCheckboxProps {
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  disable?: React.ReactNode | boolean;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?(checked: boolean): void;
  showCheckbox?: boolean;
  className?: string;
  checkboxSize?: number;
}

const FieldCheckbox = ({
  leftIcon,
  rightSlot,
  children,
  disable,
  checked,
  onChange,
  defaultChecked = false,
  showCheckbox = true,
  className,
  checkboxSize = 20,
}: FieldCheckboxProps) => {
  const isControlled = useRef(typeof checked !== 'undefined').current;
  const [_checked, setChecked] = useState<boolean>(
    isControlled ? (checked as boolean) : defaultChecked
  );

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    if (checked !== _checked) {
      setChecked(checked!);
    }
  }, [checked]);

  const handleToggle = (checked) => {
    if (disable) {
      return;
    }
    onChange && onChange(checked);
  };

  return (
    <Field
      className={cx(
        'bg-white flex justify-between items-center py-12 px-16 border transition-colors',
        'lg:max-w-[460px]',
        _checked ? 'border-blue-light' : 'border-white',
        disable ? 'opacity-40' : 'hover:border-blue-light',
        className
      )}
      leftIcon={leftIcon}
      rightIcon={
        rightSlot
          ? rightSlot
          : disable ||
            (showCheckbox && (
              <Checkbox
                checked={_checked}
                width={`${checkboxSize}px`}
                height={`${checkboxSize}px`}
                background="#27C193"
                onChange={handleToggle}
              />
            ))
      }
      onClick={() => {
        handleToggle(!checked);
      }}
    >
      {children}
    </Field>
  );
};

export default FieldCheckbox;
