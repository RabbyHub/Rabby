// https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol
import { EventEmitter } from 'events';
import { isAddress } from 'web3-utils';
import { addHexPrefix, bufferToHex } from 'ethereumjs-util';
import WalletConnect from '@walletconnect/client';
import i18n from '../i18n';

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
    if (localStorage.getItem('walletconnect')) {
      // always clear walletconnect cache
      localStorage.removeItem('walletconnect');
    }
    const connector = new WalletConnect({
      bridge: 'https://wcbridge.debank.com',
      clientMeta: {
        description: i18n.t('appDescription'),
        url: 'https://rabby.io',
        icons: ['https://rabby.io/assets/images/logo.png'],
        name: 'Rabby',
      },
    });
    this.walletConnector = connector;
    if (!connector.connected) {
      // create new session
      await connector.createSession();
    }
    console.log(connector.uri);
    return connector;
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
    // TODO: split by protocol(walletconnect, cold wallet, etc)
    await this.initWalletConnect();

    return new Promise((resolve, reject) => {
      const connector = this.walletConnector!;
      // Check if connection is already established

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
        try {
          const result = await connector.sendTransaction({
            data: this._normalize(transaction.data),
            from: address,
            gas: this._normalize(transaction.gas),
            gasPrice: this._normalize(transaction.gasPrice),
            nonce: this._normalize(transaction.nonce),
            to: this._normalize(transaction.to),
            value: this._normalize(transaction.value) || '0x0', // prevent 0x
          });
          resolve(result);
          connector.killSession();
          this.walletConnector = null;
        } catch (e) {
          reject(e);
          connector.killSession();
          this.walletConnector = null;
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
        this.walletConnector = null;
      });
    });
  }

  async signPersonalMessage(address: string, message: string) {
    return new Promise((resolve, reject) => {
      this.initWalletConnect();
      const connector = this.walletConnector!;
      // Check if connection is already established
      if (!connector.connected) {
        // create new session
        connector.createSession();
      }
      connector.on('connect', async (error, payload) => {
        if (error) {
          reject(error);
        }

        // Get provided accounts and chainId
        const { accounts } = payload.params[0];
        if (accounts[0].toLowerCase() !== address.toLowerCase()) {
          reject('not same address');
          return;
        }
        try {
          const result = await connector.signPersonalMessage([
            message,
            address,
          ]);
          resolve(result);
          connector.killSession();
          this.walletConnector = null;
        } catch (e) {
          reject(e);
          connector.killSession();
          this.walletConnector = null;
        }
      });
    });
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

  _normalize(buf) {
    return sanitizeHex(bufferToHex(buf).toString());
  }
}

export default WatchKeyring;
