const colors = require('tailwindcss/colors');

module.exports = {
  mode: 'jit',
  purge: ['./src/ui/**/*.{ts,tsx,html}'],
  theme: {
    spacing: [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 60].reduce(
      (m, n) => {
        m[n] = `${n}px`;
        return m;
      },
      {}
    ),
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
        light: '#8697FF',
        DEFAULT: '#796BFD',
      },
      green: '#27C193',
      white: colors.white,
      yellow: '#F29C1B',
      pink: '#F24822',
      red: {
        light: '#F24822',
        DEFAULT: '#AF160E',
      },
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
  important: true,
};
