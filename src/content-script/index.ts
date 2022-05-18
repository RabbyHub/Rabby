import { Message } from 'utils';
import { nanoid } from 'nanoid';

const channelName = nanoid();

const injectScript = (type: 'src' | 'content', content: string) => {
  // the script element with src won't execute immediately
  // use inline script element instead!
  const container = document.head || document.documentElement;
  const ele = document.createElement('script');
  // in prevent of webpack optimized code do some magic(e.g. double/sigle quote wrap),
  // seperate content assignment to two line
  // use AssetReplacePlugin to replace pageprovider content
  // let content = `var channelName = '${channelName}';`;
  // content += '#PAGEPROVIDER#';
  if (type === 'src') {
    ele.setAttribute('src', content);
  } else {
    ele.textContent = content;
  }
  container.insertBefore(ele, container.children[0]);
  container.removeChild(ele);
};

injectScript('content', `var channelName = '${channelName}';`);
injectScript('src', chrome.runtime.getURL('pageProvider.js'));

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
