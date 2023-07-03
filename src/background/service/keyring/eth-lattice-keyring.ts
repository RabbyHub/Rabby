/* eslint-disable */
import OldLatticeKeyring from '@rabby-wallet/eth-lattice-keyring';
import { SignHelper } from './helper';
import { EVENTS } from '@/constant';

const keyringType = 'GridPlus Hardware';

import HDPathType = LedgerHDPathType;
import { LedgerHDPathType } from '@/utils/ledger';

const HD_PATH_BASE = {
  [HDPathType.BIP44]: "m/44'/60'/0'/0/x",
  [HDPathType.Legacy]: "m/44'/60'/0'/x",
  [HDPathType.LedgerLive]: "m/44'/60'/x'/0/0",
};

const HD_PATH_TYPE = {
  [HD_PATH_BASE[HDPathType.BIP44]]: HDPathType.BIP44,
  [HD_PATH_BASE[HDPathType.Legacy]]: HDPathType.Legacy,
  [HD_PATH_BASE[HDPathType.LedgerLive]]: HDPathType.LedgerLive,
};

class LatticeKeyring extends OldLatticeKeyring {
  [x: string]: any;
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

  async getCurrentAccounts() {
    const addrs = await this.getAccounts();
    const hdPath = this.hdPath;

    return addrs
      .map((address, index) => {
        return {
          address,
          index: this.accountIndices[index] + 1,
          hdPath: this.accountOpts[index]?.hdPath,
        };
      })
      .filter((account) => {
        return account.hdPath === hdPath;
      });
  }

  async getAddresses(start: number, end: number) {
    try {
      const PER_PAGE = end - start;
      // Otherwise unlock the device and fetch more addresses
      await this.unlock();
      const addrs = await this._fetchAddresses(PER_PAGE, start);
      const accounts = addrs.map((address, i) => {
        return {
          address,
          balance: null,
          index: start + i + 1,
        };
      });
      return accounts;
    } catch (err) {
      // This will get hit for a few reasons. Here are two possibilities:
      // 1. The user has a SafeCard inserted, but not unlocked
      // 2. The user fetched a page for a different wallet, then switched
      //    interface on the device
      // In either event we should try to resync the wallet and if that
      // fails throw an error
      try {
        await this._connect();
        return this.getAddresses(start, end);
      } catch (err) {
        throw new Error(
          'Failed to get accounts. Please forget the device and try again. ' +
            'Make sure you do not have a locked SafeCard inserted.'
        );
      }
    }
  }

  getHDPathBase(hdPathType: HDPathType) {
    return HD_PATH_BASE[hdPathType];
  }

  // return top 3 accounts for each path type
  async getInitialAccounts() {
    await this.unlock();
    const defaultHDPath = this.hdPath;
    this.setHdPath(this.getHDPathBase(HDPathType.LedgerLive));
    const LedgerLiveAccounts = await this.getAddresses(0, 3);
    this.setHdPath(this.getHDPathBase(HDPathType.BIP44));
    const BIP44Accounts = await this.getAddresses(0, 3);
    this.setHdPath(this.getHDPathBase(HDPathType.Legacy));
    const LegacyAccounts = await this.getAddresses(0, 3);
    this.setHdPath(defaultHDPath);

    return {
      [HDPathType.LedgerLive]: LedgerLiveAccounts,
      [HDPathType.BIP44]: BIP44Accounts,
      [HDPathType.Legacy]: LegacyAccounts,
    };
  }

  async setHDPathType(hdPathType: HDPathType) {
    const hdPath = this.getHDPathBase(hdPathType);
    this.setHdPath(hdPath);
  }

  async getCurrentUsedHDPathType() {
    return HD_PATH_TYPE[this.hdPath];
  }
}

export default LatticeKeyring;
