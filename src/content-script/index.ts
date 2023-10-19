import { Message } from '@/utils';
import { nanoid } from 'nanoid';

import { v4 as uuid } from 'uuid';

const channelName = nanoid();

const injectProviderScript = (isDefaultWallet: boolean) => {
  // the script element with src won't execute immediately
  // use inline script element instead!
  const container = document.head || document.documentElement;
  const ele = document.createElement('script');
  // in prevent of webpack optimized code do some magic(e.g. double/sigle quote wrap),
  // seperate content assignment to two line
  // use AssetReplacePlugin to replace pageprovider content
  let content = `var __rabby__channelName = '${channelName}';`;
  content += `var __rabby__isDefaultWallet = ${isDefaultWallet};`;
  content += `var __rabby__uuid = '${uuid()}';`;
  content += '#PAGEPROVIDER#';
  ele.textContent = content;
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

const getIsDefaultWallet = () => {
  return pm.request({ method: 'isDefaultWallet' }) as Promise<boolean>;
};

getIsDefaultWallet()
  .then((isDefaultWallet) => {
    injectProviderScript(!!isDefaultWallet);
  })
  .catch((err) => {
    injectProviderScript(true);
  });
