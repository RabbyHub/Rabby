import React from 'react';
import { cn } from '@/ui/utils/cn';

type BookMarkProps = {
  content: string;
  className?: string;
};

export const BookMark = ({ content, className, ...rest }: BookMarkProps) => {
  return (
    <div
      {...rest}
      className={cn(
        'relative left-0 bg-rb-neutral-secondary rounded-[0_6px_6px_0]',
        'text-12 font-medium text-rb-neutral-InvertHighlight py-4 px-16',
        className
      )}
    >
      {content}
    </div>
  );
};

export default BookMark;
