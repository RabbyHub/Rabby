import { Slider, SliderSingleProps } from 'antd';
import React from 'react';
import { cn } from '@/ui/utils/cn';
import styles from './Slider.module.css';

export const SwapSlider = (props: SliderSingleProps) => {
  return <Slider {...props} className={cn(styles.slider, props.className)} />;
};
