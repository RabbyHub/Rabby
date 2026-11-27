module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    require('postcss-nested'),
    require('postcss-custom-properties'),
    // wrap everything but Tailwind in @layer legacy; must stay last
    require('./build/postcss-cascade-layer'),
  ],
};
