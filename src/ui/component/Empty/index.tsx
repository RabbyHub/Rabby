import { cn } from '@/ui/utils/cn';
import React, { ReactNode } from 'react';

interface EmptyProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  title?: ReactNode;
  desc?: ReactNode;
}

const Empty = ({ className, style, children, title, desc }: EmptyProps) => {
  return (
    <div className={cn('text-center', className)} style={style}>
      <img
        className="w-[100px] h-[100px] mb-16 mx-auto"
        src="./images/nodata-tx.png"
      />
      <div className="text-center">
        {title && (
          <div className="font-medium text-[17px] leading-[20px] text-r-neutral-title-1 mb-8">
            {title}
          </div>
        )}
        <div className="font-normal text-14 leading-[16px] text-r-neutral-body">
          {children ? children : desc}
        </div>
      </div>
    </div>
  );
};

export default Empty;
