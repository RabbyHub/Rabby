import React from 'react';
import { ReactComponent as IconBackCC } from '@/ui/assets/new-user-import/back-cc.svg';
import { ReactComponent as IconDotCC } from '@/ui/assets/new-user-import/dot-cc.svg';
import clsx from 'clsx';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { cn } from '@/ui/utils/cn';
import styles from './index.module.css';

const Step = ({ step }: { step: 1 | 2 }) => {
  return (
    <div className="flex items-center justify-center gap-4">
      <IconDotCC className="text-rabby-blue-default" viewBox="0 0 8 8" />
      <div
        className={clsx(
          'w-[16px] h-[1px]',
          step === 2 ? 'bg-rabby-blue-default' : 'bg-rabby-blue-light2'
        )}
      />
      <IconDotCC
        className={clsx(
          step === 2 ? 'text-rabby-blue-default' : 'text-rabby-blue-light2'
        )}
        viewBox="0 0 8 8"
      />
    </div>
  );
};

export const Card = ({
  title,
  step,
  children,
  onBack,
  className,
  headerClassName,
  headerBlock,
  cardStyle,
}: React.PropsWithChildren<{
  title?: React.ReactNode;
  step?: 1 | 2;
  onBack?: () => void;
  className?: string;
  headerClassName?: string;
  headerBlock?: boolean;
  cardStyle?: React.CSSProperties;
}>) => {
  const { isDarkTheme } = useThemeMode();

  return (
    <div className={clsx(styles.bg, isDarkTheme && styles.bgDark)}>
      <div className={cn(styles.card, className)} style={cardStyle}>
        <div
          className={clsx(
            headerBlock ? 'block' : !onBack && !title && !step && 'hidden',
            'header',
            headerClassName,
            step && 'mt-18',
            title && 'mt-[14px]',
            !step && !title && onBack && 'mt-18'
          )}
        >
          {!!onBack && (
            <div className="back-icon" onClick={onBack}>
              <IconBackCC
                className="w-20 h-20 text-r-neutral-body"
                viewBox="0 0 20 20"
              />
            </div>
          )}
          {title ? <div>{title}</div> : step ? <Step step={step} /> : null}
        </div>
        {children}
      </div>
    </div>
  );
};
