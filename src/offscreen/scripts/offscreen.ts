import { initBitBox02 } from './bitbox02';
import { initImKey } from './imkey';
import initLattice from './lattice';
import { initOneKey } from './onekey';

initImKey();
initOneKey();
initBitBox02();
initLattice();

setInterval(() => {
  chrome.runtime.sendMessage({ type: 'ping' });
}, 20000);
