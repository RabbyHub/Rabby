import ReactDOM from 'react-dom';
import App from 'popup/views';

import './index.css';

chrome?.runtime?.getBackgroundPage((win) => {
  ReactDOM.render(<App eth={win.eth} />, document.getElementById('root'));
});
