import { initBitBox02 } from './bitbox02';
import { initImKey } from './imkey';
import initLattice from './lattice';
import { initOneKey } from './onekey';

initImKey();
initOneKey();
initBitBox02();
initLattice();

// keep alive when ui page is open
let pageCount = 0;
const keepAlive = () => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'pageClosed') {
      pageCount = Math.max(0, pageCount - 1);
      console.log('[keepAlive] close page, remain page count:', pageCount);
    } else if (request.type === 'pageOpened') {
      pageCount++;
      console.log('[keepAlive] open page, remain page count:', pageCount);
    }
  });

  setInterval(() => {
    if (pageCount === 0) {
      return;
    }
    console.log('[keepAlive]', new Date());
    chrome.runtime.sendMessage({ type: 'ping' });
  }, 2000);
};
keepAlive();
