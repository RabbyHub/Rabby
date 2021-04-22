import ReactDOM from 'react-dom';
import App from 'ui/views';

import './index.css';

chrome?.runtime?.getBackgroundPage((win) => {
  ReactDOM.render(<App wallet={win.wallet} />, document.getElementById('root'));
});
