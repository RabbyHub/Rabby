import { Message } from 'utils';

const { PortMessage, DomMessage } = Message;

function injectPage(url) {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('pageProvider.js');
  s.addEventListener('load', function() {
    this.remove()
  });
  (document.head || document.documentElement).appendChild(s);
}

injectPage('pageProvider.js');

const pm = new PortMessage().connect();

const dm = new DomMessage().listen((data) => pm.request(data));
// background notification
pm.on('message', (data) => dm.send('message', data));

function connectTab(connect) {
  const origin = location.origin;
  const icon = (document.querySelector('head > link[rel~="icon"]') as HTMLLinkElement)?.href;
  const name =
    (document.querySelector('head > meta[name="title"]') as HTMLMetaElement)?.content ||
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
