import { useLayoutEffect, useRef } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import type { InputRef } from 'antd';

/**
 * Insert thousands separators into the integer part only, keeping an optional
 * non-digit prefix (e.g. `-`, `$`) and everything after the integer digits
 * (decimal point, fraction, suffix like `%`).
 *
 * Done on the string (not BigNumber) so in-progress input stays intact:
 * `1234.` -> `1,234.`, `1.50` -> `1.50`, `0.00` -> `0.00`.
 */
export const formatThousands = (val: string): string => {
  if (!val) return val;
  const match = val.match(/^(\D*)(\d+)(.*)$/);
  if (!match) return val;
  const [, prefix, intPart, rest] = match;
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return prefix + grouped + rest;
};

export interface ThousandsCore {
  displayValue: string | undefined;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

// A "content" char is part of the actual number (digit / dot / minus); anything
// else — the thousands ',' and value prefixes like '$' — is decoration.
// Anchoring the caret on content chars keeps it correct even when a prefix is
// added or removed by the parent (e.g. the leading '$' on deposit/margin inputs).
const isContentChar = (ch: string) =>
  (ch >= '0' && ch <= '9') || ch === '.' || ch === '-';

const countContent = (s: string) => {
  let n = 0;
  for (let i = 0; i < s.length; i += 1) {
    if (isContentChar(s[i])) n += 1;
  }
  return n;
};

/**
 * Shared core: formats the controlled value, strips separators back out before
 * forwarding to the parent onChange (existing validation/state logic stays
 * untouched), and restores the caret after reformatting. `getDom` returns the
 * underlying input (works for both antd and native inputs).
 */
export const useThousandsCore = (
  value: unknown,
  onChange: ((e: ChangeEvent<HTMLInputElement>) => void) | undefined,
  getDom: () => HTMLInputElement | null | undefined
): ThousandsCore => {
  const caretRef = useRef<number | null>(null);

  const displayValue =
    value === undefined || value === null || value === ''
      ? (value as string | undefined)
      : formatThousands(String(value));

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const rawDisplay = el.value;
    const selectionStart = el.selectionStart ?? rawDisplay.length;
    // content chars left of the caret — used to restore it after reformatting
    caretRef.current = countContent(rawDisplay.slice(0, selectionStart));
    // hand the parent a separator-free value; its onChange stays unchanged
    el.value = rawDisplay.replace(/,/g, '');
    onChange?.(e);
  };

  useLayoutEffect(() => {
    if (caretRef.current === null) return;
    const want = caretRef.current;
    caretRef.current = null;
    const dom = getDom();
    if (!dom) return;
    // map that count back to a caret position inside the formatted value
    const dv = dom.value;
    let idx = 0;
    let count = 0;
    while (idx < dv.length && count < want) {
      if (isContentChar(dv[idx])) count += 1;
      idx += 1;
    }
    dom.setSelectionRange(idx, idx);
  });

  return { displayValue, handleChange };
};

export interface ThousandsInputBinding {
  ref: RefObject<InputRef>;
  value: string | undefined;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Thousands display for antd `Input`. The parent onChange still receives a
 * plain, separator-free numeric string — only the rendered value gains commas.
 */
export const useThousandsInput = (
  value: unknown,
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
): ThousandsInputBinding => {
  const inputRef = useRef<InputRef>(null);
  const { displayValue, handleChange } = useThousandsCore(
    value,
    onChange,
    () => inputRef.current?.input
  );
  return { ref: inputRef, value: displayValue, onChange: handleChange };
};
