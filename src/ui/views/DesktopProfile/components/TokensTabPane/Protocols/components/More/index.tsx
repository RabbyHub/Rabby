import React, { ReactNode } from 'react';
import { cn } from '@/ui/utils/cn';

export const More: React.FC<{ children?: ReactNode; className?: string }> = (
  props
) => {
  return (
    <span className={cn('w-full flex flex-col', props.className)}>
      <div className="w-full justify-start flex-wrap flex flex-row">
        {props.children}
      </div>
    </span>
  );
};

export const KV = (props: {
  k: ReactNode;
  v: ReactNode;
  vClassName?: string;
}) => {
  return (
    <div className="min-w-[220px] flex">
      <span className="text-13 text-r-neutral-title1 leading-[16px] mr-8">
        {props.k}
      </span>
      <span
        className={cn(
          'text-13 font-medium text-r-neutral-title1 leading-[16px]',
          props.vClassName
        )}
      >
        {props.v}
      </span>
    </div>
  );
};
