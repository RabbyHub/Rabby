import { KEYRING_CLASS } from '@/constant';

// process.env.IS_MANIFEST_MV3 is replaced with a literal at build time, so
// webpack drops the other manifest's require and the device SDKs behind it.
// MV3 talks to the devices from the offscreen document; the MV2 bridges load
// the SDKs into the background page itself.
const ImKeyBridge = process.env.IS_MANIFEST_MV3
  ? require('./eth-imkey-keyring/imkey-offscreen-bridge')
  : require('./eth-imkey-keyring/imkey-bridge');

const OneKeyBridge = process.env.IS_MANIFEST_MV3
  ? require('./eth-onekey-keyring/onekey-offscreen-bridge')
  : require('./eth-onekey-keyring/onekey-bridge');

const TrezorBridge = process.env.IS_MANIFEST_MV3
  ? require('./eth-trezor-keyring/trezor-offscreen-bridge')
  : require('@rabby-wallet/eth-trezor-keyring/dist/trezor-bridge');

const BitBox02Bridge = process.env.IS_MANIFEST_MV3
  ? require('./eth-bitbox02-keyring/bitbox02-offscreen-bridge')
  : require('./eth-bitbox02-keyring/bitbox02-bridge');

export const getKeyringBridge = async (type: string) => {
  if (type === KEYRING_CLASS.HARDWARE.IMKEY) {
    return new (await ImKeyBridge).default();
  }

  if (type === KEYRING_CLASS.HARDWARE.ONEKEY) {
    return new (await OneKeyBridge).default();
  }

  if (type === KEYRING_CLASS.HARDWARE.TREZOR) {
    return new (await TrezorBridge).default();
  }

  if (type === KEYRING_CLASS.HARDWARE.BITBOX02) {
    return new (await BitBox02Bridge).default();
  }

  return;
};

export const hasBridge = async (type: string) => {
  return !!(await getKeyringBridge(type));
};
