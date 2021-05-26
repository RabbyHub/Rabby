import { Message } from 'utils';
import { nanoid } from 'nanoid';

const channelName = nanoid();

const container = document.head || document.documentElement;
const ele = document.createElement('script');
// the script element with src won't execute immediately
ele.textContent = `var channelName = '${channelName}';`;
ele.textContent += '#PAGEPROVIDER#';
container.insertBefore(ele, container.children[0]);
container.removeChild(ele);

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
