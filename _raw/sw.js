try {
  importScripts(
    '/webextension-polyfill.js',
    '/background.js'
  );
} catch (e) {
  console.error(e);
}
