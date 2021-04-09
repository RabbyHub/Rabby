module.exports = {
  mode: 'jit',
  purge: ['./src/ui/**/*.html', './src/ui/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#ff8062',
      },
    },
  },
  // prefers-color-scheme
  darkMode: 'media',
  plugins: [require('@tailwindcss/forms')],
};
