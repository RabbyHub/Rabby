// https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol
import { EventEmitter } from 'events';
import { ethErrors } from 'eth-rpc-errors';
import { isAddress } from 'web3-utils';
import {
  addHexPrefix,
  bufferToHex,
  bufferToInt,
  intToHex,
} from 'ethereumjs-util';
import WalletConnect from '@walletconnect/client';

const keyringType = 'Watch Address';

function sanitizeHex(hex: string): string {
  hex = hex.substring(0, 2) === '0x' ? hex.substring(2) : hex;
  if (hex === '') {
    return '';
  }
  hex = hex.length % 2 !== 0 ? '0' + hex : hex;
  return '0x' + hex;
}

class WatchKeyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];
  accountToAdd = '';
  walletConnector: WalletConnect | null = null;

  constructor(opts = {}) {
    super();
    this.deserialize(opts);
  }

  serialize() {
    return Promise.resolve({
      accounts: this.accounts,
    });
  }

  async deserialize(opts) {
    if (opts.accounts) {
      this.accounts = opts.accounts;
    }
  }

  setAccountToAdd = (account) => {
    this.accountToAdd = account;
  };

  initWalletConnect = async () => {
    const connector = new WalletConnect({
      bridge: 'https://bridge.walletconnect.org/',
      // bridge: 'http://10.0.0.52:5555',
    });
    this.walletConnector = connector;
    console.log(this.walletConnector);
  };

  addAccounts = async () => {
    if (!isAddress(this.accountToAdd)) {
      throw new Error("The account you're are trying to import is a invalid");
    }
    const prefixedAddress = addHexPrefix(this.accountToAdd);

    if (
      this.accounts
        .map((x) => x.toLowerCase())
        .includes(prefixedAddress.toLowerCase())
    ) {
      throw new Error("The account you're are trying to import is a duplicate");
    }

    this.accounts.push(prefixedAddress);

    return [prefixedAddress];
  };

  // pull the transaction current state, then resolve or reject
  async signTransaction(address, transaction) {
    return new Promise((resolve, reject) => {
      this.initWalletConnect();

      const connector = this.walletConnector!;
      // Check if connection is already established
      if (!connector.connected) {
        // create new session
        connector.createSession();
      }

      // Subscribe to connection events
      connector.on('connect', async (error, payload) => {
        if (error) {
          reject(error);
        }

        // Get provided accounts and chainId
        const { accounts, chainId } = payload.params[0];
        if (accounts[0].toLowerCase() !== address.toLowerCase()) {
          reject('not same address');
          return;
        }
        console.log({
          from: address,
          to: bufferToHex(transaction.to),
          gas: sanitizeHex(bufferToHex(transaction.gas)),
          gasPrice: sanitizeHex(bufferToHex(transaction.gasPrice)),
          // value: sanitizeHex(bufferToHex(transaction.value)),
          data: sanitizeHex(bufferToHex(transaction.data)),
          nonce: sanitizeHex(bufferToHex(transaction.nonce)),
        });
        try {
          const result = await connector.signTransaction({
            from: address,
            to: bufferToHex(transaction.to),
            gas: sanitizeHex(bufferToHex(transaction.gas)),
            gasPrice: sanitizeHex(bufferToHex(transaction.gasPrice)),
            // value: sanitizeHex(intToHex(bufferToInt(transaction.value))),
            value: '0x00',
            data: sanitizeHex(bufferToHex(transaction.data)),
            nonce: sanitizeHex(bufferToHex(transaction.nonce)),
          });
          resolve(result);
          connector.killSession();
        } catch (e) {
          reject(e);
          connector.killSession();
        }
      });

      connector.on('session_update', (error, payload) => {
        if (error) {
          reject(error);
        }

        // Get updated accounts and chainId
        const { accounts, chainId } = payload.params[0];
      });

      connector.on('disconnect', (error, payload) => {
        if (error) {
          reject(error);
        }

        // Delete connector
      });
    });
  }

  async signPersonalMessage(withAccount: string, message: string) {
    throw ethErrors.provider.userRejectedRequest();
  }

  async getAccounts(): Promise<string[]> {
    return this.accounts.slice();
  }

  removeAccount(address: string): void {
    if (
      !this.accounts.map((a) => a.toLowerCase()).includes(address.toLowerCase())
    ) {
      throw new Error(`Address ${address} not found in watch keyring`);
    }
    this.accounts = this.accounts.filter(
      (a) => a.toLowerCase() !== address.toLowerCase()
    );
  }
}

export default WatchKeyring;
