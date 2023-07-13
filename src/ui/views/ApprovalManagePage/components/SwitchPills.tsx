import React from 'react';
import clsx from 'clsx';

type Option = {
  key: string;
  label: string;
};

export default function PillsSwitch<T extends readonly Option[] | Option[]>({
  options = ([] as unknown) as T,
  value,
  onChange,
}: {
  value?: T[number]['key'];
  options?: T;
  onChange?: (key: T[number]['key']) => any;
}) {
  return (
    <div className="pills-switch">
      {options.map((item: Option) => {
        const isActive = item.key === value;
        return (
          <div
            key={`pills-switch-${item.key}`}
            className={clsx('pills-switch__item', { 'is-active': isActive })}
            onClick={() => {
              onChange?.(item.key);
            }}
          >
            <div className="pills-switch__item__title">{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}
