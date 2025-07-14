/**
 * @type {import('postcss').ProcessOptions}
 */
module.exports = {
  plugins: [
    require('postcss-import'),
    require('postcss-nested'),
    require('autoprefixer'),
    require('tailwindcss'),
    require('postcss-custom-properties'),
  ],
};
