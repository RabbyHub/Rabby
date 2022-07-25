import { Message } from 'utils';
import { browser } from 'webextension-polyfill-ts';
import { EVENTS } from '@/constant';
import { nanoid } from 'nanoid';

const channelName = nanoid();

const initListener = (channelName: string) => {
  const { BroadcastChannelMessage, PortMessage } = Message;
  const pm = new PortMessage().connect();

  const bcm = new BroadcastChannelMessage(channelName).listen((data) =>
    pm.request(data)
  );

  // background notification
  pm.on('message', (data) => bcm.send('message', data));

  pm.request({
    type: EVENTS.UIToBackground,
    method: 'getScreen',
    params: { availHeight: screen.availHeight },
  });

  document.addEventListener('beforeunload', () => {
    bcm.dispose();
    pm.dispose();
  });
};

// the script element with src won't execute immediately
// use inline script element instead!
const container = document.head || document.documentElement;
const ele = document.createElement('script');

ele.setAttribute('src', browser.runtime.getURL('pageProvider.js'));
container.insertBefore(ele, container.children[0]);
container.removeChild(ele);
initListener(channelName);

// because the content script run at document start
setTimeout(() => {
  document.body.setAttribute('data-channel-name', channelName);
}, 0);
