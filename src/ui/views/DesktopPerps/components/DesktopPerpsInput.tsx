import React from 'react';
import { Input, InputProps } from 'antd';
import { cn } from '@/ui/utils/cn';
import { useThousandsInput } from '../hooks/useThousandsInput';
import styles from './DesktopPerpsInput.module.css';

interface DesktopPerpsInputProps extends InputProps {}

export const DesktopPerpsInput: React.FC<DesktopPerpsInputProps> = (props) => {
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
