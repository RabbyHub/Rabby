import React from 'react';
import ReactDOM from 'react-dom';
import { browser } from 'webextension-polyfill-ts';
import Views from './views';

import './style/index.less';

setTimeout(() => {
  browser.runtime.getBackgroundPage().then((win) => {
    ReactDOM.render(
      <Views wallet={win.wallet} />,
      document.getElementById('root')
    );
  });
});
