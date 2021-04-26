// inspired by https://github.com/ant-design/ant-design/blob/master/components/checkbox/Checkbox.tsx
import { useContext, createContext, useState, useEffect } from 'react';
import cx from 'clsx';

const GroupContext = createContext();

const CheckboxGroup = ({ className, children, onChange, ...restProps }) => {
  const [registerValues, setRegisterValues] = useState([]);
  const [value, setValue] = useState(restProps.value || []);

  useEffect(() => {
    if ('value' in restProps) {
      setValue(restProps.value || []);
    }
  }, [restProps.value]);

  const registerValue = (val) => {
    setRegisterValues((vals) => [...vals, val]);
  };

  const cancelValue = (val) => {
    setRegisterValues((vals) => vals.filter((v) => v !== val));
  };

  const toggleOption = (val) => {
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

const Checkbox = ({ className, value, children, ...restProps }) => {
  const baseClassName = 'w-full border border-gray rounded py-1 px-2';
  const checkboxGroup = useContext(GroupContext);

  useEffect(() => {
    checkboxGroup?.registerValue(value);

    return () => checkboxGroup?.cancelValue(value);
  }, []);

  const handleChange = () => {
    checkboxGroup?.toggleOption(value);
  };

  return (
    <label className={cx(baseClassName, className)}>
      <input
        type="checkbox"
        onChange={handleChange}
        checked={checkboxGroup?.value.includes(value)}
        {...restProps}
      />
      <span>{children}</span>
    </label>
  );
};

Checkbox.Group = CheckboxGroup;

export default Checkbox;
