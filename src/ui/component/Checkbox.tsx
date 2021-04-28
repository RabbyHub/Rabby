// inspired by https://github.com/ant-design/ant-design/blob/master/components/checkbox/Checkbox.tsx
import React, { useContext, createContext, useState, useEffect, ReactNode } from 'react';
import cx from 'clsx';

export type CheckboxValueType = string | number | boolean;

export interface CheckboxOptionType {
  label: React.ReactNode;
  value: CheckboxValueType;
  style?: React.CSSProperties;
  disabled?: boolean;
  onChange?: (e: any) => void;
}

export interface CheckboxGroupContext {
  name?: string;
  toggleOption?: (option: CheckboxOptionType) => void;
  value?: string[];
  disabled?: boolean;
  registerValue: (val: string) => void;
  cancelValue: (val: string) => void;
}

interface CheckboxProps {
  className?: string
  children?: ReactNode
  onChange?(val: any): void
  value: any
}

interface CheckboxGroupProps {
  className?: string,
  children?: ReactNode,
  onChange?: (e: any) => void;
  value: string[]
}

const GroupContext = createContext<CheckboxGroupContext | null>(null);

const CheckboxGroup = ({ className, children, onChange, ...restProps }: CheckboxGroupProps) => {
  const [registerValues, setRegisterValues] = useState<string[]>([]);
  const [value, setValue] = useState(restProps.value || []);

  useEffect(() => {
    if ('value' in restProps) {
      setValue(restProps.value || []);
    }
  }, [restProps.value]);

  const registerValue = (val: string) => {
    setRegisterValues((vals) => [...vals, val]);
  };

  const cancelValue = (val) => {
    setRegisterValues((vals) => vals.filter((v) => v !== val));
  };

  const toggleOption = (val: any) => {
    const checkedBefore = value.indexOf(val);
    const newValue = [...value];

    if (checkedBefore === -1) {
      newValue.push(val);
    } else {
      newValue.splice(checkedBefore, 1);
    }

    if (!('value' in restProps)) {
      setValue(newValue);
    }

    onChange?.(newValue.filter((v) => registerValues.includes(v)));
  };

  const context = {
    value,
    registerValue,
    cancelValue,
    toggleOption,
  };

  return (
    <div className={className} {...restProps}>
      <GroupContext.Provider value={context}>{children}</GroupContext.Provider>
    </div>
  );
};

const Checkbox = ({ className, value, children, ...restProps }: CheckboxProps) => {
  const baseClassName = 'w-full border border-gray rounded py-1 px-2';
  const checkboxGroup = useContext(GroupContext);

  useEffect(() => {
    checkboxGroup?.registerValue(value);

    return () => checkboxGroup?.cancelValue(value);
  }, []);

  const handleChange = () => {
    if (checkboxGroup && checkboxGroup.toggleOption) {
      checkboxGroup.toggleOption(value);
    }
  };

  return (
    <label className={cx(baseClassName, className)}>
    <input
        type="checkbox"
        onChange={handleChange}
        checked={checkboxGroup?.value?.includes(value)}
        {...restProps}
      />
      <span>{children}</span>
    </label>
  );
};

Checkbox.Group = CheckboxGroup;

export default Checkbox;
