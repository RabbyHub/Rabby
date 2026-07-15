import { InputRef } from 'antd';
import {
  RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type AmountInputOverflowPosition = 'start' | 'end';

export type AmountInputRef = RefObject<InputRef> | RefObject<HTMLInputElement>;

type GetAutoSizeAmountFontSizeParams = {
  containerWidth: number;
  textWidthAtMaxFontSize: number;
  maxFontSize: number;
  minFontSize: number;
  fontSizeStep: number;
};

export const getAutoSizeAmountFontSize = ({
  containerWidth,
  textWidthAtMaxFontSize,
  maxFontSize,
  minFontSize,
  fontSizeStep,
}: GetAutoSizeAmountFontSizeParams) => {
  if (!containerWidth || !textWidthAtMaxFontSize) {
    return maxFontSize;
  }

  for (
    let nextFontSize = maxFontSize;
    nextFontSize >= minFontSize;
    nextFontSize -= fontSizeStep
  ) {
    if (
      (textWidthAtMaxFontSize * nextFontSize) / maxFontSize <=
      containerWidth
    ) {
      return nextFontSize;
    }
  }

  return minFontSize;
};

type UseAutoSizeAmountInputParams = {
  inputRef: AmountInputRef;
  inputValue: string;
  measureText: string;
  maxFontSize: number;
  minFontSize: number;
  fontSizeStep?: number;
  overflowPosition?: AmountInputOverflowPosition;
};

export const useAutoSizeAmountInput = ({
  inputRef,
  inputValue,
  measureText,
  maxFontSize,
  minFontSize,
  fontSizeStep = 2,
  overflowPosition = 'end',
}: UseAutoSizeAmountInputParams) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidthAtMaxFontSize, setTextWidthAtMaxFontSize] = useState(0);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateWidth = () => {
      setContainerWidth(node.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    setTextWidthAtMaxFontSize(measureRef.current?.offsetWidth || 0);
  }, [measureText]);

  const fontSize = useMemo(
    () =>
      getAutoSizeAmountFontSize({
        containerWidth,
        textWidthAtMaxFontSize,
        maxFontSize,
        minFontSize,
        fontSizeStep,
      }),
    [
      containerWidth,
      fontSizeStep,
      maxFontSize,
      minFontSize,
      textWidthAtMaxFontSize,
    ]
  );

  useEffect(() => {
    const inputRefCurrent = inputRef.current;
    const input =
      inputRefCurrent && 'input' in inputRefCurrent
        ? inputRefCurrent.input
        : inputRefCurrent;
    if (!input) {
      return;
    }

    if (overflowPosition === 'start') {
      input.scrollLeft = 0;
      return;
    }

    const isFocused =
      typeof document !== 'undefined' && document.activeElement === input;
    const isEditingBeforeEnd =
      isFocused &&
      (input.selectionStart === null ||
        input.selectionEnd === null ||
        input.selectionStart < input.value.length ||
        input.selectionEnd < input.value.length);

    if (fontSize === minFontSize && !isEditingBeforeEnd) {
      input.scrollLeft = input.scrollWidth;
    }
  }, [fontSize, inputRef, inputValue, minFontSize, overflowPosition]);

  return {
    containerRef,
    measureRef,
    fontSize,
  };
};
