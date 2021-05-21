import React, { useState, useEffect, useRef } from 'react';
import cx from 'clsx';
import { Field } from 'ui/component';
import IconChecked from 'ui/assets/checked.svg';
import IconNotChecked from 'ui/assets/not-checked.svg';

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

  const handleToggle = () => {
    if (disable) {
      return;
    }
    const v = !_checked;
    setChecked(v);
    onChange && onChange(v);
  };

  return (
    <Field
      className={cx(
        'rounded bg-white mb-8 flex justify-between align-center py-12 pl-16 pr-20 border hover:border-blue transition-colors',
        'lg:w-[460px]',
        _checked ? 'border-blue' : 'border-white',
        disable && 'opacity-70'
      )}
      leftIcon={leftIcon}
      rightIcon={
        disable || (
          <img
            className="icon icon-checked"
            src={_checked ? IconChecked : IconNotChecked}
          />
        )
      }
      onClick={handleToggle}
    >
      {children}
    </Field>
  );
};

export default FieldCheckbox;
