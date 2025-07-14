// const colors = require('tailwindcss/colors');
// const tinycolor2 = require('tinycolor2');
const {
  blackA,
  violet,
  mauve,
  grassA,
  amberA,
  grayA,
  irisA,
} = require('@radix-ui/colors');

// const { themeColors, rabbyCssPrefix } = require('./src/constant/theme-colors');

/*const rabbyColors = ['light', 'dark'].reduce(
  (accu, theme) => {
    Object.entries(themeColors[theme]).forEach(([cssvarKey, colorValue]) => {
      // const splitorIdx = cssvarKey.indexOf('-');
      // const group = cssvarKey.slice(0, splitorIdx);
      // const suffix = cssvarKey.slice(splitorIdx + 1);
      const tinyColor = tinycolor2(colorValue);
      const alpha = tinyColor.getAlpha();

      const hexValue =
        alpha === 1 ? tinyColor.toHexString() : tinyColor.toHex8String();

      if (!accu.auto[cssvarKey]) {
        accu.auto[
          cssvarKey
        ] = `var(--${rabbyCssPrefix}${cssvarKey}, ${hexValue})`;
      }

      accu[theme][cssvarKey] = hexValue;
    });

    return accu;
  },
  {
    light: {},
    dark: {},
    auto: {},
  }
);*/

/** @type {import('tailwindcss').Config} */
// module.exports = {
//   mode: 'jit',
//   purge: ['./src/ui/**/*.{ts,tsx,html}'],
//   content: [
//     "./**/*.{tsx,html}",
//     "./node_modules/@radix-ui/themes/**/*.{js,ts,jsx,tsx}", // Add Radix UI themes
//   ],
//   theme: {
//     spacing: [
//       0,
//       1,
//       2,
//       4,
//       6,
//       8,
//       10,
//       12,
//       14,
//       16,
//       18,
//       20,
//       24,
//       28,
//       32,
//       40,
//       60,
//       80,
//     ].reduce((m, n) => {
//       m[n] = `${n}px`;
//       return m;
//     }, {}),
//     screens: {
//       sm: { max: '600px' },
//       lg: { min: '600px' },
//     },
//     /*colors: {
//       transparent: 'transparent',
//       current: 'currentColor',
//       blue: {
//         from: '#8A78FD',
//         to: '#796BFD',
//         light: rabbyColors.light['blue-default'],
//         DEFAULT: '#796BFD',
//         purple: '#5F75FF',
//       },
//       black: '#707280',
//       green: '#27C193',
//       white: colors.white,
//       yellow: '#F29C1B',
//       orange: '#FFB020',
//       pink: '#F24822',
//       red: {
//         light: '#F24822',
//         DEFAULT: '#AF160E',
//         forbidden: '#EC5151',
//       },
//       gray: {
//         bg2: '#F5F6FA',
//         bg: '#F5F6FA',
//         divider: '#E5E9EF',
//         comment: '#B4BDCC',
//         content: '#707280',
//         subTitle: '#4B4D59',
//         title: '#13141A',
//         light: '#707880',
//         common: '#666666',
//       },
//     },*/
//     fontSize: {
//       12: [
//         '12px',
//         {
//           lineHeight: '14px',
//         },
//       ],
//       13: '13px',
//       14: [
//         '14px',
//         {
//           lineHeight: '18px',
//         },
//       ],
//       15: [
//         '15px',
//         {
//           lineHeight: '18px',
//         },
//       ],
//       18: [
//         '18px',
//         {
//           lineHeight: '22px',
//         },
//       ],
//       20: '20px',
//       24: [
//         '24px',
//         {
//           lineHeight: '28px',
//         },
//       ],
//       28: [
//         '28px',
//         {
//           lineHeight: '33px',
//         },
//       ],
//     },
//     /** @notice configuration here would override the default config above */
//     extend: {
//       colors: {
//         [`${rabbyCssPrefix.replace(/\-$/, '')}`]: rabbyColors.auto,
//         [`${'rabby-'.replace(/\-$/, '')}`]: rabbyColors.auto,
//         [`${'-r-'.replace(/\-$/, '')}`]: rabbyColors.auto,
//
//         [`light-${rabbyCssPrefix.replace(/\-$/, '')}`]: rabbyColors.light,
//         [`dark-${rabbyCssPrefix.replace(/\-$/, '')}`]: rabbyColors.dark,
//       }
//     },
//   },
//   // use class insteadof media-query prefers-color-scheme
//   // see https://v2.tailwindcss.com/docs/dark-mode
//   darkMode: 'class',
//   important: true,
// };

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/ui/**/*.{jsx,tsx,html}',
    './node_modules/@radix-ui/themes/**/*.{js,ts,jsx,tsx}', // Add Radix UI themes
  ],
  darkMode: 'class', // Use class-based dark mode
  theme: {
    extend: {
      colors: {
        ...blackA,
        ...grayA,
        ...irisA,
        ...violet,
        ...mauve,
        ...grassA,
        ...amberA,
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
      },
    },
  },
};
