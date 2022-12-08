import { Message } from 'utils';
import { browser } from 'webextension-polyfill-ts';
import { EVENTS } from '@/constant';

const initListener = () => {
  const { WindowMessage, PortMessage } = Message;
  const pm = new PortMessage().connect();

  const bcm = new WindowMessage().listen((data) => pm.request(data));

  // background notification
  pm.on('message', (data) => bcm.send('message', data));

  pm.request({
    type: EVENTS.UIToBackground,
    method: 'getScreen',
    params: { availHeight: screen.availHeight },
  });

  const WORKER_KEEP_ALIVE_INTERVAL = 1000;
  const WORKER_KEEP_ALIVE_MESSAGE = 'WORKER_KEEP_ALIVE_MESSAGE';
  const TIME_45_MIN_IN_MS = 45 * 60 * 1000;

  let keepAliveInterval;
  let keepAliveTimer;

  const runWorkerKeepAliveInterval = () => {
    clearTimeout(keepAliveTimer);

    keepAliveTimer = setTimeout(() => {
      clearInterval(keepAliveInterval);
    }, TIME_45_MIN_IN_MS);

    clearInterval(keepAliveInterval);
    pm.send('message', WORKER_KEEP_ALIVE_MESSAGE);

    keepAliveInterval = setInterval(() => {
      if (browser.runtime.id) {
        pm.send('message', WORKER_KEEP_ALIVE_MESSAGE);
      }
    }, WORKER_KEEP_ALIVE_INTERVAL);
  };

  runWorkerKeepAliveInterval();

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
initListener();
