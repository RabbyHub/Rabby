import { cn } from '@/ui/utils/cn';

const tailwindConfig = require('../../tailwind.config.js');

describe('cn', () => {
  it('keeps a custom font size next to a theme text color', () => {
    expect(cn('text-12', 'text-r-neutral-title-1')).toBe(
      'text-12 text-r-neutral-title-1'
    );
  });

  it('lets the later of two custom font sizes win', () => {
    expect(cn('text-12', 'text-14')).toBe('text-14');
  });

  it('resolves the custom font weight against built-in weights', () => {
    expect(cn('font-510', 'font-medium')).toBe('font-medium');
  });

  it('lets a caller className override the component default', () => {
    expect(cn('px-8 py-2', false && 'hidden', 'px-16')).toBe('py-2 px-16');
  });

  it('registers every custom font size and weight from tailwind.config.js', () => {
    const sizes = Object.keys(tailwindConfig.theme.fontSize);
    sizes.forEach((size) => {
      expect(cn(`text-${size}`, 'text-r-neutral-title-1')).toBe(
        `text-${size} text-r-neutral-title-1`
      );
    });

    const weights = Object.keys(tailwindConfig.theme.extend.fontWeight);
    weights.forEach((weight) => {
      expect(cn(`font-${weight}`, 'font-bold')).toBe('font-bold');
    });
  });
});
