import { cn } from '@/ui/utils/cn';
import React, { ReactNode } from 'react';
import { SvgIconLoading } from 'ui/assets';

interface CopyProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  loading?: boolean;
}

const Loading = ({ className, style, children, loading }: CopyProps) => {
  return loading ? (
    <div className={cn('text-center', className)} style={style}>
      <SvgIconLoading
        className="w-[36px] h-[36px] mb-12 mx-auto animate-[spining_1s_linear_infinite]"
        fill="#707280"
      ></SvgIconLoading>
      <div className="text-center text-14 leading-[16px] text-r-neutral-body">
        {children}
      </div>
    </div>
  ) : null;
};

export default Loading;
