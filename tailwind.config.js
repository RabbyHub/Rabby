const colors = require('tailwindcss/colors');

const { themeColors } = require('./src/constant/theme-colors');
const rabbyColors = Object.entries(themeColors.light).reduce((accu, [cssvarKey, cssvarValue]) => {
  const [ name, suffix ] = cssvarKey.split('-');
  accu[name] = accu[name] || {};
  accu[name][suffix] = `var(--${cssvarKey}, ${cssvarValue})`;
  return accu;
}, {});

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
        light: '#7084ff',
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
      colors: {
        ...rabbyColors,
      }
    },
  },
  // use media-query prefers-color-scheme
  darkMode: 'media',
  important: true,
};
