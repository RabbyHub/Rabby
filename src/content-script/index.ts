import { Message } from '@/utils/message';
import PortMessage from '@/utils/message/portMessage';
import browser from 'webextension-polyfill';

import { EXTENSION_MESSAGES } from '@/constant/message';

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

const { BroadcastChannelMessage } = Message;

let pm: PortMessage | null = new PortMessage().connect();

const bcm = new BroadcastChannelMessage({
  name: 'rabby-content-script',
  target: 'rabby-page-provider',
}).listen((data) => {
  return pm?.request(data);
});

// background notification
pm?.on('message', (data) => bcm.send('message', data));

document.addEventListener('beforeunload', () => {
  bcm.dispose();
  pm?.dispose();
});

const onDisconnectDestroyStreams = (err) => {
  pm?.port?.onDisconnect.removeListener(onDisconnectDestroyStreams);

  pm?.dispose();
  pm = null;
};
pm?.port?.onDisconnect.addListener(onDisconnectDestroyStreams);

const onMessageSetUpExtensionStreams = (msg) => {
  if (msg.name === EXTENSION_MESSAGES.READY) {
    if (!pm) {
      pm = new PortMessage().connect();
    }
    return Promise.resolve(`Rabby: handled ${EXTENSION_MESSAGES.READY}`);
  }
  return undefined;
};
browser.runtime.onMessage.addListener(onMessageSetUpExtensionStreams);

injectProviderScript(false);
