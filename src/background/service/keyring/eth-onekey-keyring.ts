import TrezorKeyring from './eth-trezor-keyring';

const keyringType = 'Onekey Hardware';

class OnekeyKeyring extends TrezorKeyring {
  static type = keyringType;
}

export default OnekeyKeyring;
