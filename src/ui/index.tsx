import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { browser } from 'webextension-polyfill-ts';
// import Views from './views';

import './style/index.less';

const App = lazy(() => import('./views'));

setTimeout(() => {
  browser.runtime.getBackgroundPage().then((win) => {
    ReactDOM.render(
      <Suspense fallback={() => 'loading'}>
        <App wallet={win.wallet} />
      </Suspense>,
      document.getElementById('root')
    );
  });
});
