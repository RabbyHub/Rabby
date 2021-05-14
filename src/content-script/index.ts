import { Message } from 'utils';
import { nanoid } from 'nanoid';
import { insertScript } from './utils';

const { BroadcastChannelMessage, PortMessage } = Message;

const channelName = nanoid();

const pm = new PortMessage().connect();

const bcm = new BroadcastChannelMessage(channelName).listen((data) =>
  pm.request(data)
);

// background notification
pm.on('message', (data) => bcm.send('message', data));

document.addEventListener('beforeunload', () => {
  bcm.dispose();
  pm.dispose();
});

insertScript(`pageProvider.js?channel=${channelName}`).then((ele) => {
  ele.remove();
});

function tabCheckin(connect) {
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
  tabCheckin(pm);
} else {
  const domContentLoadedHandler = () => {
    tabCheckin(pm);
    window.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
  };
  window.addEventListener('DOMContentLoaded', domContentLoadedHandler);
}
