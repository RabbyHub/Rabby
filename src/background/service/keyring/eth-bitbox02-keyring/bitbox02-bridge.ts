import type { PairedBitBox } from 'bitbox-api';
import * as bitbox from 'bitbox-api';
import { BitBox02BridgeInterface } from './bitbox02-bridge-interface';
import browser from 'webextension-polyfill';
import * as HDKey from 'hdkey';
import { toBytes } from '@ethereumjs/util';

export default class BitBox02Bridge implements BitBox02BridgeInterface {
  isDeviceConnected = false;

  app: PairedBitBox | null = null;

  hdk: HDKey = new HDKey();

  private async openPopup(url) {
    await browser.windows.create({
      url,
      type: 'popup',
      width: 320,
      height: 175,
    });
  }

  private maybeClosePopup() {
    browser.runtime.sendMessage({ type: 'bitbox02', action: 'popup-close' });
  }

  init = async (hdPath) => {
    try {
      const onCloseCb = () => {
        this.maybeClosePopup();
      };
      const device = await bitbox.bitbox02ConnectBridge(onCloseCb);
      const pairing = await device.unlockAndPair();
      const pairingCode = pairing.getPairingCode();
      if (pairingCode) {
        await this.openPopup(
          `vendor/bitbox02/bitbox02-pairing.html?code=${encodeURIComponent(
            pairingCode
          )}`
        );
      }
      this.app = await pairing.waitConfirm();
      this.maybeClosePopup();
      this.isDeviceConnected = true;
      const rootPub = await this.app.ethXpub(hdPath);
      this.hdk = HDKey.fromExtendedKey(rootPub);

      if (!this.app.ethSupported()) {
        throw new Error('Unsupported device');
      }
    } catch (err) {
      console.error(err);
      if (this.app) {
        this.app.close();
      }
      throw err;
    }
  };

  ethSignTransaction: BitBox02BridgeInterface['ethSignTransaction'] = async (
    chainId,
    keypath,
    tx
  ) => {
    if (!this.app) {
      throw new Error('Device not initialized');
    }

    const data: bitbox.EthTransaction = {
      nonce: toBytes(tx.nonce),
      gasPrice: toBytes(tx.gasPrice),
      gasLimit: toBytes(tx.gasLimit),
      recipient: toBytes(tx.to),
      value: toBytes(tx.value),
      data: toBytes(tx.data),
    };

    return this.app.ethSignTransaction(BigInt(chainId), keypath, data);
  };

  ethSign1559Transaction: BitBox02BridgeInterface['ethSign1559Transaction'] = async (
    keypath,
    tx
  ) => {
    if (!this.app) {
      throw new Error('Device not initialized');
    }

    const data: bitbox.Eth1559Transaction = {
      chainId: Number(tx.chainId),
      nonce: toBytes(tx.nonce),
      maxPriorityFeePerGas: toBytes(tx.maxPriorityFeePerGas),
      maxFeePerGas: toBytes(tx.maxFeePerGas),
      gasLimit: toBytes(tx.gasLimit),
      recipient: toBytes(tx.to),
      value: toBytes(tx.value),
      data: toBytes(tx.data),
    };

    return this.app.ethSign1559Transaction(keypath, data);
  };

  ethSignMessage: BitBox02BridgeInterface['ethSignMessage'] = async (
    chainId,
    keypath,
    message
  ) => {
    if (!this.app) {
      throw new Error('Device not initialized');
    }

    return this.app.ethSignMessage(BigInt(chainId), keypath, toBytes(message));
  };

  ethSignTypedMessage: BitBox02BridgeInterface['ethSignTypedMessage'] = async (
    chainId,
    keypath,
    message
  ) => {
    if (!this.app) {
      throw new Error('Device not initialized');
    }
    return this.app.ethSignTypedMessage(BigInt(chainId), keypath, message);
  };
}
