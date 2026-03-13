import React from 'react';
import styled from 'styled-components';
import { Input, InputProps } from 'antd';
import { formatSpeicalAmount } from '../utils/format';

const StyledInputComponent = styled(Input)<{ $fontSize: string }>`
  border-right-width: 0 !important;
  border-color: transparent !important;
  font-size: ${({ $fontSize }) => $fontSize} !important;
  line-height: 28px !important;
  font-weight: 500 !important;
  color: var(--r-neutral-title-1) !important;
`;

interface StyledInputProps extends InputProps {
  onValueChange?: (v: string) => void;
  fontSize?: number | string;
}
export const LendingStyledInput = (props: StyledInputProps) => {
  const { fontSize = 20, onValueChange, ...rest } = props;
  const resolvedFontSize =
    typeof fontSize === 'number' ? `${fontSize}px` : fontSize;

  return (
    <StyledInputComponent
      {...rest}
      $fontSize={resolvedFontSize}
      autoFocus
      onChange={(e) => onValueChange?.(formatSpeicalAmount(e.target.value))}
    />
  );
};
