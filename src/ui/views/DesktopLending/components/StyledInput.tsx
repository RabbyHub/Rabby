import React, { useMemo, useRef } from 'react';
import styled from 'styled-components';
import { Input, InputProps } from 'antd';
import { formatSpeicalAmount } from '../utils/format';
import debounce from 'lodash/debounce';

const DEBOUNCE_MS = 300;
const StyledInputComponent = styled(Input)`
  border-right-width: 0 !important;
  border-color: transparent !important;
  font-size: 20px !important;
  line-height: 28px !important;
  font-weight: 500 !important;
  color: var(--r-neutral-title-1) !important;
`;

interface StyledInputProps extends InputProps {
  onValueChange?: (v: string) => void;
}
export const LendingStyledInput = (props: StyledInputProps) => {
  const onValueChangeRef = useRef(props.onValueChange);
  onValueChangeRef.current = props.onValueChange;

  const debouncedOnValueChange = useMemo(
    () =>
      debounce((v: string) => {
        onValueChangeRef.current?.(v);
      }, DEBOUNCE_MS),
    []
  );

  React.useEffect(() => {
    return () => debouncedOnValueChange.cancel();
  }, [debouncedOnValueChange]);

  return (
    <StyledInputComponent
      {...props}
      autoFocus
      onChange={(e) =>
        debouncedOnValueChange?.(formatSpeicalAmount(e.target.value))
      }
    />
  );
};
