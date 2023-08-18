import { ethers } from 'ethers';
import COBOSAFE_ABI from './abi/account.json';
import L2_ABI from './abi/l2.json';

const Operation = {
  CALL: 0,
  DELEGATE_CALL: 1,
};

export class CoboSafeAccount {
  provider: ethers.providers.Web3Provider;
  contract: ethers.Contract;
  address: string;

  constructor(
    coboSafeAddress: string,
    provider: ethers.providers.Web3Provider
  ) {
    this.provider = provider;
    this.contract = new ethers.Contract(
      coboSafeAddress,
      COBOSAFE_ABI,
      this.provider
    );
    this.address = coboSafeAddress;
  }

  // Override wallet functions.
  async getAddress() {
    return this.contract.getAccountAddress() as Promise<string>;
  }

  getAllDelegates() {
    return this.contract.getAllDelegates() as Promise<string[]>;
  }

  async safe() {
    return this.getAddress();
  }

  // Cobo Safe functions.
  async execTransactionWithHint(
    to,
    data = '0x',
    value = 0,
    flag = Operation.CALL,
    useHint = true,
    extra = '0x',
    delegate = null
  ) {
    let cobosafe = this.contract;
    if (delegate) {
      cobosafe = cobosafe.connect(delegate);
    }

    const tx = [
      flag,
      to,
      value,
      data,
      '0x', // hint
      extra,
    ];
    if (useHint) {
      const ret = await cobosafe.callStatic.execTransaction(tx);
      tx[4] = ret[2];
    }
    const newTx = await cobosafe.populateTransaction.execTransaction(tx);

    return newTx;
  }

  async execRawTransaction(
    tx,
    delegate = null,
    flag = Operation.CALL,
    useHint = true,
    extra = '0x'
  ) {
    const to = tx['to'];
    const value = tx['value'];
    const data = tx['data'];
    return await this.execTransactionWithHint(
      to,
      data,
      value,
      flag,
      useHint,
      extra,
      delegate
    );
  }

  async checkIsModuleEnabled({
    safeAddress,
    coboSafeAddress,
  }: {
    safeAddress: string;
    coboSafeAddress: string;
  }) {
    const contract = new ethers.Contract(safeAddress, L2_ABI, this.provider);
    return (await contract.isModuleEnabled(coboSafeAddress)) as boolean;
  }
}
