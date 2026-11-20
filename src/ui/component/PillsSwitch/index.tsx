import React from 'react';
import clsx from 'clsx';
import { cn } from '@/ui/utils/cn';

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
    <div
      {...props}
      className={cn(
        'inline-flex items-center justify-center h-full p-4 rounded-[6px] bg-r-neutral-line',
        props.className
      )}
    >
      {options.map((item: Option) => {
        const isActive = item.key === value;
        const callerClasses = clsx(
          itemClassname,
          isActive ? itemClassnameActive : itemClassnameInActive
        );

        return (
          <div
            key={`pills-switch-${item.key}`}
            className={cn(
              'flex items-center justify-center w-[148px] h-full cursor-pointer',
              'text-center text-[12px] font-medium not-italic',
              // A caller that styles the inactive item owns its colour, hover
              // included.
              !itemClassnameInActive &&
                'text-r-neutral-body hover:text-r-blue-default',
              isActive && 'rounded-[4px] bg-white text-r-blue-default',
              callerClasses,
              // Last, so a caller's font size does not drop it in cn(); a
              // caller's own line height still wins.
              !/(^|\s)leading-/.test(callerClasses) && 'leading-[normal]'
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
