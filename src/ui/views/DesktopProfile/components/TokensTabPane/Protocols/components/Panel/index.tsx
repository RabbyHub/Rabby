import React, { ReactNode } from 'react';

import BookMark from '../BookMark';
import { cn } from '@/ui/utils/cn';

export const Panel: React.FC<{
  tag?: string;
  proposalTag?: ReactNode;
  subTag?: ReactNode;
  className?: string;
  key?: string;
  children?: ReactNode;
  moreContent?: ReactNode;
  rightContent?: ReactNode;
}> = (props) => {
  const {
    tag,
    subTag,
    proposalTag,
    className,
    moreContent,
    rightContent,
    ...rest
  } = props;
  return (
    <div className={cn('pt-12', className)} {...rest}>
      <div className="flex items-center mb-12">
        {tag && <BookMark content={tag} />}
        {proposalTag}
        {subTag}
        {moreContent}
        {rightContent}
      </div>
      <div className="p-0">{props.children}</div>
    </div>
  );
};
