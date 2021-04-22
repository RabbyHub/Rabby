module.exports = {
  mode: 'jit',
  purge: ['./src/ui/**/*.{js,html}'],
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
  // use media-query prefers-color-scheme
  darkMode: 'media',
  plugins: [require('@tailwindcss/forms')],
};
