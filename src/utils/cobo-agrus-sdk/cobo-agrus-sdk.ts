import { ethers } from 'ethers';
import COBOSAFE_ABI from './abi/account.json';
import L2_ABI from './abi/l2.json';
import abiCoder, { AbiCoder } from 'web3-eth-abi';
import wallet from '@/background/controller/wallet';

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
    delegate = null,
    chainId
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
      const calldata = ((abiCoder as unknown) as AbiCoder).encodeFunctionCall(
        {
          inputs: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'flag',
                  type: 'uint256',
                },
                {
                  internalType: 'address',
                  name: 'to',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'value',
                  type: 'uint256',
                },
                {
                  internalType: 'bytes',
                  name: 'data',
                  type: 'bytes',
                },
                {
                  internalType: 'bytes',
                  name: 'hint',
                  type: 'bytes',
                },
                {
                  internalType: 'bytes',
                  name: 'extra',
                  type: 'bytes',
                },
              ],
              internalType: 'struct CallData',
              name: 'callData',
              type: 'tuple',
            },
          ],
          name: 'execTransaction',
          outputs: [
            {
              components: [
                {
                  internalType: 'bool',
                  name: 'success',
                  type: 'bool',
                },
                {
                  internalType: 'bytes',
                  name: 'data',
                  type: 'bytes',
                },
                {
                  internalType: 'bytes',
                  name: 'hint',
                  type: 'bytes',
                },
              ],
              internalType: 'struct TransactionResult',
              name: 'result',
              type: 'tuple',
            },
          ],
          type: 'function',
        },
        [tx as any]
      );
      const hint = await wallet.requestETHRpc<any>(
        {
          method: 'eth_call',
          params: [
            {
              from: delegate,
              to: cobosafe.address,
              data: calldata,
              value: '0x0',
            },
            'latest',
          ],
        },
        chainId
      );
      const ret = ((abiCoder as unknown) as AbiCoder).decodeParameter(
        'tuple(bool,bytes,bytes)',
        hint
      );
      tx[4] = ret[2];
    }
    const newTx = await cobosafe.populateTransaction.execTransaction(tx);

    return newTx;
  }

  async execRawTransaction(
    tx,
    delegate = null,
    chainId,
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
      delegate,
      chainId
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
