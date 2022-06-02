/*global chrome*/
try {
  importScripts(
    '/runtime~background.js',
    '/webextension-polyfill.js',
    '/background.js'
  );
} catch (e) {
  console.error(e);
}
