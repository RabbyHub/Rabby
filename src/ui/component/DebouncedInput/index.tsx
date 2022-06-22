import React from 'react';

import { Input, InputProps } from 'antd';
import useDebounceValue from '@/ui/hooks/useDebounceValue';

/**
 * @description same as antd's Input, but with debounce
 */
const DebouncedInput = React.forwardRef(
  (
    {
      debounceValue = 250,
      ...props
    }: Omit<InputProps, 'value' | 'onChange'> & {
      value?: string;
      onChange?: (value: string) => any;
      debounceValue?: number;
    },
    ref
  ) => {
    const inputRef = React.useRef<Input>(null);
    React.useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    const [value, _setValue] = React.useState<string>(props.value || '');

    React.useEffect(() => {
      _setValue(props.value || '');
      if (props.autoFocus) inputRef.current?.focus();
    }, [props.value]);

    const debouncedValue = useDebounceValue(value, debounceValue);
    React.useEffect(() => {
      props.onChange?.(debouncedValue);
    }, [debouncedValue]);

    return (
      <Input
        {...props}
        ref={inputRef}
        value={value}
        onChange={(evt) => {
          _setValue(evt.target.value || '');
        }}
      />
    );
  }
);

export default DebouncedInput;
