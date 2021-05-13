import { Message } from 'utils';
import { insertScript } from './utils';

const { PortMessage, DomMessage } = Message;

insertScript('pageProvider.js').then((ele) => {
  ele.remove();
});

const pm = new PortMessage().connect();

const dm = new DomMessage().listen((data) => pm.request(data));
// background notification
pm.on('message', (data) => dm.send('message', data));

function connectTab(connect) {
  const origin = location.origin;
  const icon =
    (document.querySelector('head > link[rel~="icon"]') as HTMLLinkElement)
      ?.href ||
    (document.querySelector('head > meta[itemprop="image"]') as HTMLMetaElement)
      .content;
  const name =
    document.title ||
    (document.querySelector('head > meta[name="title"]') as HTMLMetaElement)
      ?.content ||
    origin;

  connect.request({
    data: {
      method: 'tabCheckin',
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
