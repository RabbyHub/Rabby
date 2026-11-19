import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import React from 'react';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/approval/edit-arrow-right.svg';
import { Divide } from './Divide';
import { cn } from '@/ui/utils/cn';
import styles from './Card.module.css';

export const Card: React.FC<
  {
    headline?: string;
    actionText?: string;
    onAction?: () => void;
    hasDivider?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
> = ({
  headline,
  actionText,
  onAction,
  hasDivider = true,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        styles.card,
        (!!onAction || !!props.onClick) && styles.hasHover,
        className
      )}
      {...props}
    >
      {headline && (
        <>
          <CardTitle
            headline={headline}
            actionText={actionText}
            onAction={onAction}
            hasAction={!!onAction || !!props.onClick || !!actionText}
          />
          {hasDivider && <Divide />}
        </>
      )}
      {children}
    </div>
  );
};

export const CardTitle: React.FC<{
  headline: string;
  actionText?: string;
  onAction?: () => void;
  hasAction?: boolean;
}> = ({ headline, actionText, onAction, hasAction }) => {
  return (
    <div
      className="flex justify-between py-12 px-16 items-center"
      onClick={onAction}
    >
      <span className="text-r-neutral-title1 text-13 font-medium leading-[16px]">
        {headline}
      </span>
      {hasAction && (
        <div className="text-13 text-r-neutral-body cursor-pointer flex items-center">
          <span>{actionText}</span>
          <ThemeIcon className="icon mt-1" src={RcIconArrowRight} />
        </div>
      )}
    </div>
  );
};
