import React, { useEffect, useRef, useState } from 'react';
import cx from 'clsx';
import { Icon } from 'ui/component';

interface TiledSelectProps {
  defaultValue?: string[]
  value: string[]
  options: string[]
  onChange(string): void
  className?: string
}

const TiledSelect = ({ defaultValue, value, options, onChange, className }: TiledSelectProps) => {
  const isControlled = useRef(typeof value !== 'undefined').current;
  const [_value, setValue] = useState(
    (isControlled ? value : defaultValue) || []
  );

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    // shallow compare
    if (_value.some((x, i) => x !== value[i])) {
      setValue(value);
    }
  }, [value]);

  const handleRemove = (idx: number) => {
    _value.splice(idx, 1);
    setValue((_value) => [..._value]);
    onChange && onChange(_value);
  };

  const handleChoose = (op: string) => {
    if (_value.includes(op)) {
      return;
    }

    _value.push(op);
    setValue((_value) => [..._value]);
    onChange && onChange(_value);
  };

  return (
    <div className={className}>
      <div className="border bg-white p-2 flex flex-wrap h-32 overflow-y-auto mb-4">
        {_value &&
          _value.map((v, i) => (
            <div className="bg-gray-100 text-gray-600 mr-2 h-4" key={v}>
              {v}
              <Icon type="cross" onClick={() => handleRemove(i)} />
            </div>
          ))}
      </div>
      <div className="flex justify-between flex-wrap">
        {options.map((o) => (
          <div
            className={cx(
              'border text-center border-primary w-16 rounded select-none text-primary mb-1 cursor-pointer',
              {
                'opacity-50': _value.includes(o),
              }
            )}
            key={o}
            onClick={() => handleChoose(o)}>
            {o}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TiledSelect;
