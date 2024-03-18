import { initBitBox02 } from './bitbox02';
import { initImKey } from './imkey';
import initLattice from './lattice';
import { initOneKey } from './onekey';
import { initTrezor } from './trezor';

initImKey();
initOneKey();
initTrezor();
initBitBox02();
initLattice();
