import React from 'react';
import clsx from 'clsx';
import { Signal } from '@/ui/component/Signal';

export interface Props {
  icon: string;
  grayIcon?: boolean;
  signal?: 'CONNECTED' | 'DISCONNECTED';
  customSignal?: React.ReactNode;
  tip?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export const CommonAccount: React.FC<Props> = ({
  icon,
  tip,
  signal,
  customSignal,
  children,
  footer,
  grayIcon,
}) => {
  const bgColor = React.useMemo(() => {
    switch (signal) {
      case 'DISCONNECTED':
        return 'gray';

      default:
      case 'CONNECTED':
        return 'green';
    }
  }, [signal]);

  return (
    <section>
      <div className={clsx('space-x-6 flex items-start', 'relative')}>
        <div className="relative">
          <img
            src={icon}
            className="w-[20px] h-[20px]"
            style={{
              filter: grayIcon
                ? 'invert(43%) sepia(7%) saturate(335%) hue-rotate(180deg) brightness(92%) contrast(90%)'
                : 'unset',
            }}
          />
          {customSignal}
          {signal && <Signal isBadge color={bgColor} />}
        </div>
        <div className="text-13 w-full text-r-neutral-foot">{tip}</div>
        {children}
      </div>
      {footer}
    </section>
  );
};
