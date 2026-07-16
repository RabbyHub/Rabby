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

type UseAutoSizeAmountInputParams = {
  inputRef: RefObject<InputRef>;
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

  const fontSize = useMemo(() => {
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
  }, [
    containerWidth,
    fontSizeStep,
    maxFontSize,
    minFontSize,
    textWidthAtMaxFontSize,
  ]);

  useEffect(() => {
    const input = inputRef.current?.input;
    if (!input) {
      return;
    }

    if (overflowPosition === 'start') {
      input.scrollLeft = 0;
      return;
    }

    if (fontSize === minFontSize) {
      input.scrollLeft = input.scrollWidth;
    }
  }, [fontSize, inputRef, inputValue, minFontSize, overflowPosition]);

  return {
    containerRef,
    measureRef,
    fontSize,
  };
};
