/* eslint-disable */
import OldLatticeKeyring from '@rabby-wallet/eth-lattice-keyring';
import { SignHelper } from './helper';
import { EVENTS } from '@/constant';

const keyringType = 'GridPlus Hardware';

class LatticeKeyring extends OldLatticeKeyring {
  static type = keyringType;
  signHelper = new SignHelper({
    errorEventName: EVENTS.COMMON_HARDWARE.REJECTED,
  });

  resend() {
    this.signHelper.resend();
  }

  async signTransaction(address, tx) {
    return this.signHelper.invoke(async () => {
      return super.signTransaction(address, tx);
    });
  }

  async signMessage(address, msg) {
    return this.signHelper.invoke(async () => {
      return super.signMessage(address, msg);
    });
  }
}

export default LatticeKeyring;
