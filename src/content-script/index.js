import { Message } from 'helper';

const { PortMessage, DomMessage } = Message;

function injectPage() {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('pageProvider.js');
  s.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(s);
}

injectPage();

const pm = new PortMessage().connect();

const dm = new DomMessage().listen((data) => pm.request(data));
// background notification
pm.on('message', (data) => dm.send('message', data));

function connectTab(connect) {
  const origin = location.origin;
  const icon = document.querySelector('head > link[rel~="icon"]')?.href;
  const name =
    document.querySelector('head > meta[name="title"]')?.content ||
    document.title ||
    origin;

  connect.request({
    data: {
      method: 'tabConnect',
      params: { icon, name, origin },
    },
  });
}

if (document.readyState === 'complete') {
  connectTab(pm);
} else {
  const domContentLoadedHandler = () => {
    connectTab(pm);
    window.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
  };
  window.addEventListener('DOMContentLoaded', domContentLoadedHandler);
}
