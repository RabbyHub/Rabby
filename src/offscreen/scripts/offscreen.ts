import { initBitBox02 } from './bitbox02';
import { initImKey } from './imkey';
import initLattice from './lattice';
import { initOneKey } from './onekey';

initImKey();
initOneKey();
initBitBox02();
initLattice();

// keep alive when ui page is open
let popupPageCount = 0;
const keepAlive = () => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'popupClosed') {
      popupPageCount--;
      console.log(
        '[keepAlive] close popup, remain page count:',
        popupPageCount
      );
    } else if (request.type === 'popupOpened') {
      popupPageCount++;
      console.log('[keepAlive] open popup, remain page count:', popupPageCount);
    }
  });

  setInterval(() => {
    if (popupPageCount <= 0) {
      return;
    }
    console.log('[keepAlive]', new Date());
    chrome.runtime.sendMessage({ type: 'ping' });
  }, 2000);
};
keepAlive();
