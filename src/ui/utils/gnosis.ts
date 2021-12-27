import { recoverPersonalSignature } from 'eth-sig-util';
import {
  recoverTypedSignature,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util';
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types';
import compareVersions from 'compare-versions';
import { isSameAddress } from './index';

const EIP712_DOMAIN_BEFORE_V130 = [
  {
    type: 'address',
    name: 'verifyingContract',
  },
];

const EIP712_DOMAIN = [
  {
    type: 'uint256',
    name: 'chainId',
  },
  {
    type: 'address',
    name: 'verifyingContract',
  },
];

const getEip712MessageTypes = (version) => {
  const eip712WithChainId = compareVersions(version, '1.3.0') !== -1;
  return {
    EIP712Domain: eip712WithChainId ? EIP712_DOMAIN : EIP712_DOMAIN_BEFORE_V130,
    SafeTx: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'value' },
      { type: 'bytes', name: 'data' },
      { type: 'uint8', name: 'operation' },
      { type: 'uint256', name: 'safeTxGas' },
      { type: 'uint256', name: 'baseGas' },
      { type: 'uint256', name: 'gasPrice' },
      { type: 'address', name: 'gasToken' },
      { type: 'address', name: 'refundReceiver' },
      { type: 'uint256', name: 'nonce' },
    ],
  };
};

export const validateETHSign = (
  signature: string,
  txHash: string,
  owner: string
) => {
  let v = parseInt(signature.slice(-2), 16);
  if (v > 30) {
    v -= 4;
  }
  const str = signature.slice(0, -2) + v.toString(16);
  return isSameAddress(
    recoverPersonalSignature({
      data: txHash,
      sig: str,
    }),
    owner
  );
};

export const validateEOASign = (
  signature: string,
  owner: string,
  tx: SafeTransactionDataPartial,
  version: string,
  safeAddress: string,
  networkId: number
) => {
  const eip712WithChainId = compareVersions(version, '1.3.0') !== -1;
  const typedData = {
    types: getEip712MessageTypes(version),
    domain: {
      chainId: eip712WithChainId ? networkId : undefined,
      verifyingContract: safeAddress,
    },
    primaryType: 'SafeTx',
    message: {
      to: tx.to,
      value: tx.value,
      data: tx.data,
      operation: tx.operation,
      safeTxGas: tx.safeTxGas,
      baseGas: tx.baseGas,
      gasPrice: tx.gasPrice,
      gasToken: tx.gasToken,
      refundReceiver: tx.refundReceiver,
      nonce: Number(tx.nonce),
    },
  };

  const address = recoverTypedSignature({
    data: typedData as any,
    signature,
    version: SignTypedDataVersion.V4,
  });

  return isSameAddress(address, owner);
};

export const crossCompareOwners = (owners1: string[], owners2: string[]) => {
  return owners1.filter(
    (owner) => !!owners2.find((own) => isSameAddress(own, owner))
  );
};
