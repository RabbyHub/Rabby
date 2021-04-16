import ReactDOM from 'react-dom';
import App from 'ui/views';

import './index.css';

const fakeWallet = new Proxy(
  {},
  {
    get(key) {
      return () => {};
    },
  }
);

chrome?.runtime?.getBackgroundPage((win) => {
  console.log('----', win.wallet)
  ReactDOM.render(<App wallet={win.wallet} />, document.getElementById('root'));
});
