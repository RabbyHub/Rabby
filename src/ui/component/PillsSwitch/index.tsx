import React from 'react';
import clsx from 'clsx';

import './index.less';

type Option = {
  key: string;
  label: string;
};

export type PillsSwitchProps<
  T extends readonly Option[] | Option[]
> = React.HTMLAttributes<HTMLDivElement> & {
  value?: T[number]['key'];
  options?: T;
  onTabChange?: (key: T[number]['key']) => any;
  itemClassname?: string;
  itemClassnameActive?: string;
  itemClassnameInActive?: string;
};

export default function PillsSwitch<T extends readonly Option[] | Option[]>({
  options = ([] as unknown) as T,
  value,
  onTabChange,
  itemClassname,
  itemClassnameActive,
  itemClassnameInActive,
  ...props
}: React.PropsWithoutRef<PillsSwitchProps<T>>) {
  return (
    <div {...props} className={clsx('pills-switch', props.className)}>
      {options.map((item: Option) => {
        const isActive = item.key === value;

        return (
          <div
            key={`pills-switch-${item.key}`}
            className={clsx(
              'pills-switch__item',
              itemClassname,
              isActive ? itemClassnameActive : itemClassnameInActive,
              { 'is-active': isActive }
            )}
            onClick={() => {
              onTabChange?.(item.key);
            }}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
}
