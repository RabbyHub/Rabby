import React from 'react';
import styled from 'styled-components';
import { Input, InputProps, InputRef } from 'antd';
import clsx from 'clsx';
import { AutoSizeAmountInput } from '@/ui/component/AutoSizeAmountInput';
import { formatSpeicalAmount } from '../utils/format';

const StyledInputComponent = styled(Input)<{ $fontSize: number }>`
  border-right-width: 0 !important;
  border-color: transparent !important;
  font-size: ${({ $fontSize }) => $fontSize}px !important;
  line-height: 28px !important;
  font-weight: 500 !important;
  color: var(--r-neutral-title-1) !important;
`;

interface StyledInputProps extends InputProps {
  onValueChange?: (v: string) => void;
  fontSize?: number | string;
  wrapperClassName?: string;
}
export const LendingStyledInput = (props: StyledInputProps) => {
  const { fontSize = 20, onValueChange, wrapperClassName, ...rest } = props;
  const inputRef = React.useRef<InputRef>(null);
  const maxFontSize =
    typeof fontSize === 'number' ? fontSize : parseFloat(fontSize) || 20;
  const minFontSize = Math.max(14, maxFontSize - 8);
  const inputValue = String(rest.value ?? '') || '0';

  return (
    <AutoSizeAmountInput
      inputRef={inputRef}
      inputValue={inputValue}
      maxFontSize={maxFontSize}
      minFontSize={minFontSize}
      fontSizeStep={2}
      fontWeight={500}
      className={clsx('min-w-0 overflow-hidden', wrapperClassName)}
    >
      {(resolvedFontSize) => (
        <StyledInputComponent
          {...rest}
          ref={inputRef}
          $fontSize={resolvedFontSize}
          autoFocus
          onChange={(e) => onValueChange?.(formatSpeicalAmount(e.target.value))}
        />
      )}
    </AutoSizeAmountInput>
  );
};
