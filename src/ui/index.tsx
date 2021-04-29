import React from 'react';
import ReactDOM from 'react-dom';
import App from './views';

import './index.less';

if (process.env.BUILD_ENV === 'START') {
  const wallet = new Proxy(
    {},
    {
      get: () => () => {},
    }
  );
  ReactDOM.render(<App wallet={wallet} />, document.getElementById('root'));
} else {
  chrome.runtime.getBackgroundPage((win) => {
    ReactDOM.render(
      <App wallet={win?.wallet} />,
      document.getElementById('root')
    );
  });
}
