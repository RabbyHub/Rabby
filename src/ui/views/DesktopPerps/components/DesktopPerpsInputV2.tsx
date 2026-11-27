import React from 'react';
import { Input, InputProps } from 'antd';
import { cn } from '@/ui/utils/cn';
import { useThousandsInput } from '../hooks/useThousandsInput';
import styles from './DesktopPerpsInputV2.module.css';

interface DesktopPerpsInputV2Props extends InputProps {}

export const DesktopPerpsInputV2: React.FC<DesktopPerpsInputV2Props> = (
  props
) => {
  const { ref, value, onChange } = useThousandsInput(
    props.value,
    props.onChange
  );
  return (
    <Input
      placeholder="0"
      {...props}
      className={cn(styles.input, props.className)}
      value={value}
      onChange={onChange}
      ref={ref}
    />
  );
};
