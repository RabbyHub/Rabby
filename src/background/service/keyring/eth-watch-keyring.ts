// https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol
import { EventEmitter } from 'events';
import { isAddress } from 'web3-utils';
import { addHexPrefix, bufferToHex } from 'ethereumjs-util';
import WalletConnect from '@walletconnect/client';
import i18n from '../i18n';
import { WALLETCONNECT_STATUS_MAP } from 'consts';
import { wait } from 'background/utils';

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
  _walletConnector: WalletConnect | null = null;
  resolvePromise: null | ((value: any) => void) = null;
  onAfterConnect: null | ((err: any, payload: any) => void) = null;
  onDisconnect: null | ((err: any, payload: any) => void) = null;
  currentConnectStatus: number = WALLETCONNECT_STATUS_MAP.PENDING;

  constructor(opts = {}) {
    super();
    this.deserialize(opts);
  }

  get walletConnector() {
    return this._walletConnector;
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
    if (this.walletConnector) {
      this.walletConnector.transportClose();
      if (this.walletConnector.connected) {
        await this.walletConnector.killSession();
      }
      this._walletConnector = null;
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
    this.currentConnectStatus = WALLETCONNECT_STATUS_MAP.PENDING;
    this._walletConnector = connector;

    this._walletConnector.on('connect', (error, payload) => {
      this.onAfterConnect && this.onAfterConnect(error, payload);
    });

    this._walletConnector.on('disconnect', (error, payload) => {
      this.onDisconnect && this.onDisconnect(error, payload);
    });

    if (!this._walletConnector.connected) {
      // create new session
      await this._walletConnector.createSession();
    }

    return this._walletConnector;
  };

  addAccounts = async () => {
    console.log('accountToAdd', this.accountToAdd);
    if (!isAddress(this.accountToAdd)) {
      throw new Error(i18n.t('importAddressInvalid'));
    }
    const prefixedAddress = addHexPrefix(this.accountToAdd);

    if (
      this.accounts
        .map((x) => x.toLowerCase())
        .includes(prefixedAddress.toLowerCase())
    ) {
      throw new Error(i18n.t('importAddressDuplicate'));
    }

    this.accounts.push(prefixedAddress);

    return [prefixedAddress];
  };

  // pull the transaction current state, then resolve or reject
  async signTransaction(address, transaction) {
    // TODO: split by protocol(walletconnect, cold wallet, etc)
    await this.initWalletConnect();

    this.onAfterConnect = async (error, payload) => {
      const connector = this.walletConnector!;
      if (error) {
        this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.FAILD, error);
        return;
      }
      this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.CONNECTED, payload);

      await wait(() => {
        this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.WAITING, payload);
      }, 1000);
      const { accounts, chainId } = payload.params[0];
      if (
        accounts[0].toLowerCase() === address.toLowerCase() &&
        chainId == transaction.getChainId()
      ) {
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
          this.resolvePromise!(result);
          this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.SIBMITTED, result);
          await connector.killSession();
          this._walletConnector = null;
        } catch (e) {
          this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.REJECTED, e);
        }
      } else {
        this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.FAILD, {
          message: 'Wrong address or chainId',
          code:
            accounts[0].toLowerCase() === address.toLowerCase() ? 1000 : 1001,
        });
      }
    };

    this.onDisconnect = (error, payload) => {
      this.updateCurrentStatus(
        WALLETCONNECT_STATUS_MAP.FAILD,
        error || payload.params[0]
      );
    };

    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
    });
  }

  async signPersonalMessage(address: string, message: string) {
    await this.initWalletConnect();

    this.onAfterConnect = async (error, payload) => {
      const connector = this.walletConnector!;
      if (error) {
        this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.FAILD, error);
        return;
      }

      const { accounts } = payload.params[0];
      if (accounts[0].toLowerCase() == address.toLowerCase()) {
        try {
          this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.CONNECTED, payload);

          await wait(() => {
            this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.WAITING, payload);
          }, 1000);
          const result = await connector.signPersonalMessage([
            message,
            address,
          ]);
          this.resolvePromise!(result);
          this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.SIBMITTED, result);
          await connector.killSession();
          this._walletConnector = null;
        } catch (e) {
          this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.REJECTED, e);
        }
      } else {
        this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.FAILD, {
          message: 'Wrong address or chainId',
          code:
            accounts[0].toLowerCase() === address.toLowerCase() ? 1000 : 1001,
        });
      }
    };

    this.onDisconnect = (error, payload) => {
      this.updateCurrentStatus(
        WALLETCONNECT_STATUS_MAP.FAILD,
        error || payload.params[0]
      );
    };
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  async signTypedData(address: string, data, options) {
    await this.initWalletConnect();

    this.onAfterConnect = async (error, payload) => {
      const connector = this.walletConnector!;
      if (error) {
        this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.FAILD, error);
        return;
      }

      const { accounts } = payload.params[0];
      if (accounts[0].toLowerCase() == address.toLowerCase()) {
        try {
          this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.CONNECTED, payload);

          await wait(() => {
            this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.WAITING, payload);
          }, 1000);

          const result = await connector.signTypedData([address, data]);
          this.resolvePromise!(result);
          this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.SIBMITTED, result);
          await connector.killSession();
          this._walletConnector = null;
        } catch (e) {
          this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.REJECTED, e);
        }
      } else {
        this.updateCurrentStatus(WALLETCONNECT_STATUS_MAP.FAILD, {
          message: 'Wrong address or chainId',
          code:
            accounts[0].toLowerCase() === address.toLowerCase() ? 1000 : 1001,
        });
      }
    };

    this.onDisconnect = (error, payload) => {
      this.updateCurrentStatus(
        WALLETCONNECT_STATUS_MAP.FAILD,
        error || payload.params[0]
      );
    };
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
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

  updateCurrentStatus(status: number, payload?: any) {
    if (
      (status === WALLETCONNECT_STATUS_MAP.REJECTED ||
        status === WALLETCONNECT_STATUS_MAP.FAILD) &&
      (this.currentConnectStatus === WALLETCONNECT_STATUS_MAP.FAILD ||
        this.currentConnectStatus === WALLETCONNECT_STATUS_MAP.REJECTED ||
        this.currentConnectStatus === WALLETCONNECT_STATUS_MAP.SIBMITTED)
    ) {
      return;
    }
    this.currentConnectStatus = status;
    this.emit('statusChange', {
      status,
      payload,
    });
  }

  _normalize(buf) {
    return sanitizeHex(bufferToHex(buf).toString());
  }
}

export default WatchKeyring;
