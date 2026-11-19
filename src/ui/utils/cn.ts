import clsx, { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge only knows Tailwind's default scales. Rabby's numeric font
// sizes (`text-12`) would otherwise be read as colors and dropped next to
// `text-r-*`, so every custom key in tailwind.config.js must be listed here.
const twMerge = extendTailwindMerge({
  // The default (500) is smaller than Rabby's set of class strings, so the
  // cache would keep evicting and every call would re-parse.
  cacheSize: 20000,
  extend: {
    classGroups: {
      'font-size': [{ text: ['12', '13', '14', '15', '18', '20', '24', '28'] }],
      'font-weight': [{ font: ['510'] }],
    },
  },
});

/**
 * Join class names and resolve Tailwind conflicts; later classes win.
 * Use it whenever a component lets callers override its own classes.
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
