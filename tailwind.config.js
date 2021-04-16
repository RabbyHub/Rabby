module.exports = {
  mode: 'jit',
  purge: ['./src/ui/**/*.html', './src/ui/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#ff8062',
      },
      boxShadow: {
        even: '0 0 15px -3px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  // prefers-color-scheme
  darkMode: 'media',
  plugins: [require('@tailwindcss/forms')],
};
