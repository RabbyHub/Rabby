import { JsonTx } from '@ethereumjs/tx';
import type { PairedBitBox } from 'bitbox-api';
import * as HDKey from 'hdkey';

export interface BitBox02BridgeInterface {
  hdk: HDKey;
  isDeviceConnected: boolean;
  init: (hdPath: string) => Promise<void>;
  ethSign1559Transaction: (
    keypath: string,
    tx: JsonTx
  ) => ReturnType<PairedBitBox['ethSign1559Transaction']>;
  ethSignTransaction: (
    chainId: number,
    keypath: string,
    tx: JsonTx
  ) => ReturnType<PairedBitBox['ethSignTransaction']>;
  ethSignMessage: (
    chainId: number,
    keypath: string,
    msg: string
  ) => ReturnType<PairedBitBox['ethSignMessage']>;
  ethSignTypedMessage: (
    chainId: number,
    keypath: string,
    msg: string
  ) => ReturnType<PairedBitBox['ethSignTypedMessage']>;
}
