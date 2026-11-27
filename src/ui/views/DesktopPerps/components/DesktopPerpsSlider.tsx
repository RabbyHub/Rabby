import { useThemeMode } from '@/ui/hooks/usePreference';
import { Slider, SliderSingleProps } from 'antd';
import React from 'react';
import { cn } from '@/ui/utils/cn';
import styles from './DesktopPerpsSlider.module.css';

export const DesktopPerpsSlider = (props: SliderSingleProps) => {
  const { isDarkTheme } = useThemeMode();
  return (
    <Slider
      {...props}
      className={cn(styles.slider, isDarkTheme && styles.dark, props.className)}
      tooltip={{
        open: false,
      }}
    />
  );
};
