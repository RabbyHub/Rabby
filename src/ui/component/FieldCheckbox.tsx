import React, { useState, useEffect, useRef } from 'react';
import cx from 'clsx';
import { Field, Checkbox } from 'ui/component';

interface FieldCheckboxProps {
  leftIcon?: React.ReactNode;
  children: React.ReactNode;
  disable?: React.ReactNode | boolean;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?(any): void;
  showCheckbox?: boolean;
}

const FieldCheckbox = ({
  leftIcon,
  children,
  disable,
  checked,
  onChange,
  defaultChecked = false,
  showCheckbox = true,
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
    setChecked(checked);
    onChange && onChange(checked);
  };

  return (
    <Field
      className={cx(
        'rounded bg-white mb-8 flex justify-between items-center py-12 px-16 border transition-colors',
        'lg:w-[460px]',
        _checked ? 'border-blue' : 'border-white',
        disable ? 'opacity-40' : 'hover:border-blue'
      )}
      leftIcon={leftIcon}
      rightIcon={
        disable ||
        (showCheckbox && (
          <Checkbox
            checked={_checked}
            width="20px"
            height="20px"
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
