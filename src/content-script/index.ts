import { Message } from 'utils';
import { nanoid } from 'nanoid';
import { browser } from 'webextension-polyfill-ts';

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

const ele = document.createElement('script');
ele.src = browser.runtime.getURL(`pageProvider.js?channel=${channelName}`);
ele.addEventListener('load', () => ele.remove());
(document.head || document.documentElement).appendChild(ele);
