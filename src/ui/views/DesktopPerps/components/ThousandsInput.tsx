import React from 'react';
import { Input, InputProps } from 'antd';
import { useThousandsInput } from '../hooks/useThousandsInput';

/**
 * antd `Input` with thousands display. Drop-in replacement for `<Input>`, used
 * where the base DesktopPerpsInput components don't fit (custom styling).
 */
export const ThousandsInput: React.FC<InputProps> = (props) => {
  const { ref, value, onChange } = useThousandsInput(
    props.value,
    props.onChange
  );
  return <Input {...props} value={value} onChange={onChange} ref={ref} />;
};
