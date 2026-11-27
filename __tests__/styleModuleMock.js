// Jest stand-in for `*.module.css`: every class name resolves to itself, so
// components render the same markup they would with real CSS Modules.
module.exports = new Proxy(
  {},
  {
    get: (_target, key) => (key === '__esModule' ? false : key),
  }
);
