const colors = require('tailwindcss/colors');
const tinycolor2 = require('tinycolor2');

const {
  themeColors,
  rabbyCssPrefix,
  appThemeColors,
  rabbyAppCssPrefix,
} = require('./src/constant/theme-colors');

const getRabbyColors = (colors, prefix) => {
  return ['light', 'dark'].reduce(
    (accu, theme) => {
      Object.entries(colors[theme]).forEach(([cssvarKey, colorValue]) => {
        // const splitorIdx = cssvarKey.indexOf('-');
        // const group = cssvarKey.slice(0, splitorIdx);
        // const suffix = cssvarKey.slice(splitorIdx + 1);
        const tinyColor = tinycolor2(colorValue);
        const alpha = tinyColor.getAlpha();

        const hexValue =
          alpha === 1 ? tinyColor.toHexString() : tinyColor.toHex8String();

        if (!accu.auto[cssvarKey]) {
          accu.auto[cssvarKey] = `var(--${prefix}${cssvarKey}, ${hexValue})`;
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
  );
};

const rabbyColors = getRabbyColors(themeColors, rabbyCssPrefix);
const rabbyAppColors = getRabbyColors(appThemeColors, rabbyAppCssPrefix);

/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  purge: ['./src/ui/**/*.{ts,tsx,html}'],
  theme: {
    spacing: [
      0,
      1,
      2,
      4,
      6,
      8,
      10,
      12,
      14,
      16,
      18,
      20,
      24,
      28,
      32,
      40,
      60,
      80,
    ].reduce((m, n) => {
      m[n] = `${n}px`;
      return m;
    }, {}),
    screens: {
      sm: { max: '600px' },
      lg: { min: '600px' },
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      blue: {
        from: '#8A78FD',
        to: '#796BFD',
        light: rabbyColors.light['blue-default'],
        DEFAULT: '#796BFD',
        purple: '#5F75FF',
      },
      black: '#707280',
      green: '#27C193',
      white: colors.white,
      yellow: '#F29C1B',
      orange: '#FFB020',
      pink: '#F24822',
      red: {
        light: '#F24822',
        DEFAULT: '#AF160E',
        forbidden: '#EC5151',
      },
      gray: {
        bg2: '#F5F6FA',
        bg: '#F5F6FA',
        divider: '#E5E9EF',
        comment: '#B4BDCC',
        content: '#707280',
        subTitle: '#4B4D59',
        title: '#13141A',
        light: '#707880',
        common: '#666666',
      },
    },
    fontSize: {
      12: [
        '12px',
        {
          lineHeight: '14px',
        },
      ],
      13: '13px',
      14: [
        '14px',
        {
          lineHeight: '18px',
        },
      ],
      15: [
        '15px',
        {
          lineHeight: '18px',
        },
      ],
      18: [
        '18px',
        {
          lineHeight: '22px',
        },
      ],
      20: '20px',
      24: [
        '24px',
        {
          lineHeight: '28px',
        },
      ],
      28: [
        '28px',
        {
          lineHeight: '33px',
        },
      ],
    },
    /** @notice configuration here would override the default config above */
    extend: {
      fontWeight: {
        510: '510',
      },
      colors: {
        [`${rabbyCssPrefix.replace(/\-$/, '')}`]: rabbyColors.auto,
        [`${'rabby-'.replace(/\-$/, '')}`]: rabbyColors.auto,
        [`${'-r-'.replace(/\-$/, '')}`]: rabbyColors.auto,

        [`light-${rabbyCssPrefix.replace(/\-$/, '')}`]: rabbyColors.light,
        [`dark-${rabbyCssPrefix.replace(/\-$/, '')}`]: rabbyColors.dark,

        [`${rabbyAppCssPrefix.replace(/\-$/, '')}`]: rabbyAppColors.auto,
        [`light-${rabbyAppCssPrefix.replace(/\-$/, '')}`]: rabbyAppColors.light,
        [`dark-${rabbyAppCssPrefix.replace(/\-$/, '')}`]: rabbyAppColors.dark,
      },
    },
  },
  // use class insteadof media-query prefers-color-scheme
  // see https://v2.tailwindcss.com/docs/dark-mode
  darkMode: 'class',
  important: true,
};
