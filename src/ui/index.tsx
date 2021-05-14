import React from 'react';
import ReactDOM from 'react-dom';
import { browser } from 'webextension-polyfill-ts';
import App from './views';

import './style/index.less';

browser.runtime.getBackgroundPage().then((win) => {
  ReactDOM.render(<App wallet={win.wallet} />, document.getElementById('root'));
});
