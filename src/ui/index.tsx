// import './wdyr';
import { browser } from 'webextension-polyfill-ts';
import './style/index.less';

// For fix chrome extension render problem in external screen
if (
  // From testing the following conditions seem to indicate that the popup was opened on a secondary monitor
  window.screenLeft < 0 ||
  window.screenTop < 0 ||
  window.screenLeft > window.screen.width ||
  window.screenTop > window.screen.height
) {
  chrome.runtime.getPlatformInfo(function (info) {
    if (info.os === 'mac') {
      const fontFaceSheet = new CSSStyleSheet();
      fontFaceSheet.insertRule(`
        @keyframes redraw {
          0% {
            opacity: 1;
          }
          100% {
            opacity: .99;
          }
        }
      `);
      fontFaceSheet.insertRule(`
        html {
          animation: redraw 1s linear infinite;
        }
      `);
      (document as any).adoptedStyleSheets = [
        ...(document as any).adoptedStyleSheets,
        fontFaceSheet,
      ];
    }
  });
}

// fixed https://github.com/RabbyHub/Rabby/issues/771
// adjust zoom when page zoom is not 1
browser.tabs.getZoom().then((zoom) => {
  if (zoom !== 1) {
    (document.querySelector('html')?.style as any).zoom = 1 / zoom;
  }
});

setTimeout(() => {
  import('./app');
}, 0);
