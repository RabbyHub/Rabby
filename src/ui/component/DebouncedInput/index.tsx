import React from 'react';

import { Input, InputProps } from 'antd';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
import { TextField } from '@radix-ui/themes';

/**
 * @description same as antd's Input, but with debounce
 */
const DebouncedInput = React.forwardRef(
  (
    {
      debounce = 250,
      ...props
    }: Omit<InputProps, 'value' | 'onChange'> & {
      value?: string;
      onChange?: (value: string) => any;
      debounce?: number;
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    const [value, _setValue] = React.useState<string>(props.value || '');

    React.useEffect(() => {
      _setValue(props.value || '');
    }, [props.value]);

    React.useEffect(() => {
      if (props.autoFocus) inputRef.current?.focus();
    }, [props.autoFocus]);

    const debouncedValue = useDebounceValue(value, debounce);
    React.useEffect(() => {
      props.onChange?.(debouncedValue);
    }, [debouncedValue]);

    return (
      <>
        {/* @ts-expect-error "This is not an error, it is a type error about the InputField used" */}
        <TextField.Root
          {...props}
          type={'password'}
          ref={inputRef}
          size="3"
          style={{ height: '100%', width: '100%' }}
          value={value}
          onChange={(evt) => {
            _setValue(evt.target.value || '');
          }}
        />
        {/*<Input
          {...props}
          ref={inputRef}
          value={value}
          onChange={(evt) => {
            _setValue(evt.target.value || '');
          }}
        />*/}
      </>
    );
  }
);

export default DebouncedInput;
