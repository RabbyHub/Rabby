import React from 'react';

import { useThemeMode } from '@/ui/hooks/usePreference';
import { getUiType } from '@/ui/utils';
import clsx from 'clsx';
import { cn } from '@/ui/utils/cn';
import styles from './index.module.css';

interface Props {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  isUnlock?: boolean;
}

const UiType = getUiType();
const isTab = UiType.isTab;
const isDesktop = UiType.isDesktop;

/** @deprecated */
export const FullscreenContainer: React.FC<Props> = ({
  children,
  className,
  style,
  isUnlock,
}) => {
  const { isDarkTheme } = useThemeMode();
  if (isDesktop && !isUnlock) {
    return (
      <div
        className={cn(styles.main, 'js-rabby-popup-container', className)}
        style={style}
      >
        {children}
      </div>
    );
  }

  if (isTab || isDesktop) {
    return (
      <div
        className={clsx(styles.container, isDarkTheme && styles.containerDark)}
      >
        <div
          className={cn(styles.main, 'js-rabby-popup-container', className)}
          style={style}
        >
          {children}
        </div>
      </div>
    );
  }
  return <>{children}</>;
};
