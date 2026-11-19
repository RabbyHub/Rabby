import React from 'react';
import { cn } from '@/ui/utils/cn';

export const Divide: React.FC<any> = ({ className, ...props }) => {
  return (
    <div
      className={cn('h-[0.5px] bg-r-neutral-card2 w-full', className)}
      {...props}
    />
  );
};
