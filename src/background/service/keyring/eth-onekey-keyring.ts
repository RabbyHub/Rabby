import TrezorKeyring from '@rabby-wallet/eth-trezor-keyring';

const keyringType = 'Onekey Hardware';

class OnekeyKeyring extends TrezorKeyring {
  static type = keyringType;
  type = keyringType;
}

export default OnekeyKeyring;
