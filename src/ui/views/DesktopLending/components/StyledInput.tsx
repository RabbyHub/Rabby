import React from 'react';
import styled from 'styled-components';
import { Input, InputProps } from 'antd';
import { formatSpeicalAmount } from '../utils/format';
import { debounce, noop } from 'lodash';

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
  const debouncedOnValueChange = React.useMemo(
    () => debounce(props.onValueChange || noop, 300),
    [props.onValueChange]
  );
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
