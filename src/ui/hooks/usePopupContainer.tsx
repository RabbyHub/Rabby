import { useMemoizedFn } from 'ahooks';
import React, { createContext, useContext, useRef } from 'react';
import { cn } from '@/ui/utils/cn';
import styles from './usePopupContainer.module.css';

const PopupContext = createContext<(() => HTMLElement) | undefined>(undefined);

export const PopupContainer: React.FC<{
  style?: StyleSheet;
  className?: string;
  children?: React.ReactNode;
}> = ({ children, style, className }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const getContainer = useMemoizedFn(() => {
    return ref.current || document.body;
  });
  return (
    <PopupContext.Provider value={getContainer}>
      <div
        ref={ref}
        style={style as React.CSSProperties}
        className={cn(styles.container, className)}
      >
        {children}
      </div>
    </PopupContext.Provider>
  );
};

export const usePopupContainer = () => {
  const getContainer = useContext(PopupContext);

  return {
    getContainer,
  };
};
