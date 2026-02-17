import React from 'react';
import styled from 'styled-components';
import { Input, InputProps } from 'antd';
import { formatSpeicalAmount } from '../utils/format';

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
  return (
    <StyledInputComponent
      {...props}
      autoFocus
      onChange={(e) =>
        props.onValueChange?.(formatSpeicalAmount(e.target.value))
      }
    />
  );
};
