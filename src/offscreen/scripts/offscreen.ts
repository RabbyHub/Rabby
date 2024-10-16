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
let timer;
const keepAlive = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (pageCount === 0) {
      return;
    }
    console.log('[keepAlive]', new Date());
    chrome.runtime.sendMessage({ type: 'ping' });
    keepAlive();
  }, 2000);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'pageClosed') {
    pageCount = Math.max(0, pageCount - 1);
    console.log('[keepAlive] close page, remain page count:', pageCount);
  } else if (request.type === 'pageOpened') {
    pageCount++;
    console.log('[keepAlive] open page, remain page count:', pageCount);
    keepAlive();
  }
});
