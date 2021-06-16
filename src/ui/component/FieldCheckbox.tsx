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
}

const FieldCheckbox = ({
  leftIcon,
  children,
  disable,
  checked,
  onChange,
  defaultChecked = false,
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
        'rounded bg-white mb-8 flex justify-between align-center py-12 pl-16 pr-20 border hover:border-blue transition-colors border-white',
        'lg:w-[460px]',
        disable && 'opacity-70'
      )}
      leftIcon={leftIcon}
      rightIcon={
        disable || (
          <Checkbox
            checked={_checked}
            width="20px"
            height="20px"
            background="#27C193"
            onChange={handleToggle}
          />
        )
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
