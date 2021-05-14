const colors = require('tailwindcss/colors');

module.exports = {
  mode: 'jit',
  purge: ['./src/ui/**/*.{ts,tsx,html}'],
  theme: {
    spacing: {
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
        1: '#F6F7F9',
        2: '#F0F2F5',
        3: '#D8DFEB',
        4: '#B4BDCC',
        5: '#818A99',
        6: '#525966',
        7: '#2D3033',
      },
    },
    fontSize: {
      12: '12px',
      13: ['13px', { fontWeight: 500 }],
      14: '14px',
      15: ['15px', { fontWeight: 500 }],
      20: ['20px', { fontWeight: 500 }],
      24: ['24px', { fontWeight: 'bold' }],
    },
  },
  // use media-query prefers-color-scheme
  darkMode: 'media',
};
