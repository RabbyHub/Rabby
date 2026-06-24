import React, { forwardRef, useRef } from 'react';
import { useThousandsCore } from '../hooks/useThousandsInput';

type ThousandsNativeInputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Native `<input>` with thousands display. Drop-in replacement for `<input>`:
 * same props, forwards ref to the underlying input, parent contract unchanged.
 */
export const ThousandsNativeInput = forwardRef<
  HTMLInputElement,
  ThousandsNativeInputProps
>(({ value, onChange, ...rest }, forwardedRef) => {
  const innerRef = useRef<HTMLInputElement | null>(null);
  const { displayValue, handleChange } = useThousandsCore(
    value,
    onChange,
    () => innerRef.current
  );

  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  return (
    <input
      {...rest}
      ref={setRefs}
      value={displayValue}
      onChange={handleChange}
    />
  );
});
