import { SignHelper } from '../helper';
import { EVENTS } from '@/constant';
import OldTrezorKeyring from '@rabby-wallet/eth-trezor-keyring';

const keyringType = 'Trezor Hardware';

class TrezorKeyring extends OldTrezorKeyring {
  static type = keyringType;
  signHelper = new SignHelper({
    errorEventName: EVENTS.COMMON_HARDWARE.REJECTED,
  });

  resend() {
    this.signHelper.resend();
  }

  resetResend() {
    this.signHelper.resetResend();
  }

  signTransaction(address, tx) {
    return this.signHelper.invoke(async () => {
      return super.signTransaction(address, tx);
    });
  }

  signPersonalMessage(withAccount, message) {
    return this.signHelper.invoke(async () => {
      return super.signPersonalMessage(withAccount, message);
    });
  }

  async signTypedData(address, data, { version }): Promise<any> {
    return this.signHelper.invoke(async () => {
      return super.signTypedData(address, data, { version });
    });
  }
}

export default TrezorKeyring;
