module.exports = {
  mode: 'jit',
  purge: [
    './src/ui/**/*.html',
    './src/ui/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ff8062',
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      }
    }
  },
  darkMode: false, // or 'media' or 'class'
}
