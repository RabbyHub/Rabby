const colors = require('tailwindcss/colors');

module.exports = {
  mode: 'jit',
  purge: ['./src/ui/**/*.{ts,tsx,html}'],
  theme: {
    spacing: {
      0: '0',
      1: '1px',
      8: '8px',
      10: '10px',
      12: '12px',
      16: '16px',
      20: '20px',
      24: '24px',
      28: '28px',
      32: '32px',
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      blue: {
        from: '#8A78FD',
        to: '#796BFD',
        light: '#8697FF',
        DEFAULT: '#796BFD',
      },
      green: '#27C193',
      white: colors.white,
      yellow: '#F29C1B',
      pink: '#F24822',
      red: '#AF160E',
      gray: {
        bg2: '#F6F7F9',
        bg: '#F0F2F5',
        divider: '#D8DFEB',
        comment: '#B4BDCC',
        content: '#818A99',
        subTitle: '#525966',
        title: '#2D3033',
      },
    },
    fontSize: {
      12: '12px',
      13: '13px',
      14: '14px',
      15: '15px',
      20: '20px',
      24: [
        '24px',
        {
          lineHeight: '28px',
        },
      ],
    },
  },
  // use media-query prefers-color-scheme
  darkMode: 'media',
};
