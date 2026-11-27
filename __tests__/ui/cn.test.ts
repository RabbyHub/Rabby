import { cn } from '@/ui/utils/cn';

import fs from 'fs';
import path from 'path';

// Rabby's font sizes and weights live in the `@theme` block of tailwind.css.
const tailwindCss = fs.readFileSync(
  path.resolve(__dirname, '../../src/ui/style/tailwind.css'),
  'utf8'
);
const themeKeys = (namespace: string) =>
  [
    ...tailwindCss.matchAll(new RegExp(`^\\s*--${namespace}-([\\w.]+):`, 'gm')),
  ].map((m) => m[1]);

describe('cn', () => {
  it('keeps a custom font size next to a theme text color', () => {
    expect(cn('text-12', 'text-r-neutral-title-1')).toBe(
      'text-12 text-r-neutral-title-1'
    );
  });

  it('lets the later of two custom font sizes win', () => {
    expect(cn('text-12', 'text-14')).toBe('text-14');
  });

  it('keeps a line height placed before a font size', () => {
    expect(cn('leading-[20px] text-[16px]')).toBe('leading-[20px] text-[16px]');
    expect(cn('text-14 leading-[16px]', 'text-12')).toBe(
      'leading-[16px] text-12'
    );
  });

  it('lets a font size with a line-height modifier replace a line height', () => {
    expect(cn('leading-[16px]', 'text-12/[20px]')).toBe('text-12/[20px]');
  });

  it('lets a caller className override the component default', () => {
    expect(cn('px-8 py-2', false && 'hidden', 'px-16')).toBe('py-2 px-16');
  });

  it('registers every custom font size and weight from tailwind.css', () => {
    const sizes = themeKeys('text');
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => {
      expect(cn(`text-${size}`, 'text-r-neutral-title-1')).toBe(
        `text-${size} text-r-neutral-title-1`
      );
    });

    themeKeys('font-weight').forEach((weight) => {
      expect(cn(`font-${weight}`, 'font-bold')).toBe('font-bold');
    });
  });
});
