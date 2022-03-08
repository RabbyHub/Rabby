import { MetaMaskKeyring } from '@keystonehq/metamask-airgapped-keyring';
import { BN, toChecksumAddress } from 'ethereumjs-util';
import { Transaction } from '@ethereumjs/tx';
import { v4 } from 'uuid';
import { Tx } from '../openapi';
import { DataType, EthSignRequest } from '@keystonehq/bc-ur-registry-eth';

const pathBase = 'm';

export default class KeystoneKeyring extends MetaMaskKeyring {
  perPage = 10;

  async getAddresses(start: number, end: number) {
    if (!this.initialized) {
      await this.readKeyring();
    }
    const accounts: {
      address: string;
      balance: number | null;
      index: number;
    }[] = [];
    for (let i = start; i < end; i++) {
      const address = await this.__addressFromIndex(pathBase, i);
      accounts.push({
        address,
        balance: null,
        index: i,
      });
      this.indexes[toChecksumAddress(address)] = i;
    }
    return accounts;
  }

  async getSignRequestUR(address: string, tx: Tx) {
    const hdPath = await this._pathFromAddress(address);
    const requestId = v4();
    const formattedTx: Transaction = Transaction.fromTxData({
      to: tx.to,
      gasLimit: tx.gasLimit,
      gasPrice: tx.gasPrice,
      data: tx.data,
      nonce: tx.nonce,
      value: tx.value,
      v: new BN(tx.chainId),
      r: new BN(0),
      s: new BN(0),
    });

    const ethSignRequest = EthSignRequest.constructETHRequest(
      formattedTx.serialize(),
      DataType.transaction,
      hdPath,
      this.xfp,
      requestId,
      tx.chainId
    );
    const ur = ethSignRequest.toUR();
    return {
      requestId,
      payload: {
        type: ur.type,
        cbor: ur.cbor.toString('hex'),
      },
    };
  }
}
