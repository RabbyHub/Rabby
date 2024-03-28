import { Message } from '@/utils/message';
import { nanoid } from 'nanoid';

import { v4 as uuid } from 'uuid';

const channelName = nanoid();
const isOpera = /Opera|OPR\//i.test(navigator.userAgent);

localStorage.setItem('rabby:channelName', channelName);
localStorage.setItem('rabby:isDefaultWallet', 'true');
localStorage.setItem('rabby:uuid', uuid());
localStorage.setItem('rabby:isOpera', isOpera.toString());

const injectProviderScript = (isDefaultWallet: boolean) => {
  // the script element with src won't execute immediately
  // use inline script element instead!
  const container = document.head || document.documentElement;
  const ele = document.createElement('script');
  // in prevent of webpack optimized code do some magic(e.g. double/sigle quote wrap),
  // separate content assignment to two line
  // use AssetReplacePlugin to replace pageprovider content
  ele.setAttribute('src', chrome.runtime.getURL('pageProvider.js'));
  container.insertBefore(ele, container.children[0]);
  container.removeChild(ele);
};

const { BroadcastChannelMessage, PortMessage } = Message;

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

injectProviderScript(false);
