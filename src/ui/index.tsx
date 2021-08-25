import React from 'react';
import ReactDOM from 'react-dom';
import { browser } from 'webextension-polyfill-ts';
import Views from './views';
import { getUiType } from 'ui/utils';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import i18n, { addResourceBundle } from 'src/i18n';
import '../i18n';

import './style/index.less';

Sentry.init({
  dsn:
    'https://e871ee64a51b4e8c91ea5fa50b67be6b@o460488.ingest.sentry.io/5831390',
  integrations: [new Integrations.BrowserTracing()],
  release: process.env.release,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

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

function initAppMeta() {
  const head = document.querySelector('head');
  const icon = document.createElement('link');
  icon.href = 'https://rabby.io/assets/images/logo-128.png';
  icon.rel = 'icon';
  head?.appendChild(icon);
  const name = document.createElement('meta');
  name.name = 'name';
  name.content = 'Rabby';
  head?.appendChild(name);
  const description = document.createElement('meta');
  description.name = 'description';
  description.content = i18n.t('appDescription');
  head?.appendChild(description);
}

initAppMeta();

browser.runtime.getBackgroundPage().then((win) => {
  const locale = win.wallet.getLocale();
  addResourceBundle(locale).then(() => {
    i18n.changeLanguage(locale);
    ReactDOM.render(
      <Views wallet={win.wallet} />,
      document.getElementById('root')
    );
  });
});

if (getUiType().isPop) {
  browser.runtime.connect(undefined, { name: 'popup' });
}
