import React, { CSSProperties, ReactNode } from 'react';
import {
  AmountInputOverflowPosition,
  AmountInputRef,
  useAutoSizeAmountInput,
} from '@/ui/hooks/useAutoSizeAmountInput';

export type { AmountInputOverflowPosition, AmountInputRef };

export type AutoSizeAmountInputProps = {
  inputRef: AmountInputRef;
  inputValue: string;
  measureText?: string;
  maxFontSize: number;
  minFontSize: number;
  fontSizeStep?: number;
  overflowPosition?: AmountInputOverflowPosition;
  fontWeight?: number;
  className?: string;
  style?: CSSProperties;
  children: (fontSize: number) => ReactNode;
};

export const AutoSizeAmountInput = ({
  inputRef,
  inputValue,
  measureText = inputValue,
  maxFontSize,
  minFontSize,
  fontSizeStep,
  overflowPosition,
  fontWeight = 700,
  className,
  style,
  children,
}: AutoSizeAmountInputProps) => {
  const { containerRef, measureRef, fontSize } = useAutoSizeAmountInput({
    inputRef,
    inputValue,
    measureText,
    maxFontSize,
    minFontSize,
    fontSizeStep,
    overflowPosition,
  });

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
        '--auto-size-amount-input-font-size': `${fontSize}px`,
      }}
    >
      {children(fontSize)}
      <span
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
          whiteSpace: 'pre',
          fontSize: maxFontSize,
          fontWeight,
        }}
      >
        {measureText}
      </span>
    </div>
  );
};

export default AutoSizeAmountInput;
