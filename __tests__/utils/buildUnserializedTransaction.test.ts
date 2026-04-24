import BigNumber from 'bignumber.js';

import buildUnserializedTransaction from '../../src/utils/optimism/buildUnserializedTransaction';

describe('buildUnserializedTransaction', () => {
  it('returns a transaction that can be serialized and fed to an Optimism smart contract', () => {
    const unserializedTransaction = buildUnserializedTransaction({
      txParams: {
        chainId: '0xa',
        nonce: '0x0',
        gasPrice: `0x${new BigNumber('100').toString(16)}`,
        gas: `0x${new BigNumber('21000').toString(16)}`,
        to: '0x0000000000000000000000000000000000000000',
        value: `0x${new BigNumber('10000000000000').toString(16)}`,
        data: '0x0',
      },
    });

    expect(unserializedTransaction.toJSON()).toMatchObject({
      nonce: '0x0',
      gasPrice: '0x64',
      gasLimit: '0x5208',
      to: '0x0000000000000000000000000000000000000000',
      value: '0x9184e72a000',
      data: '0x00',
    });
  });

  it('throws a clear error when chainId is missing', () => {
    expect(() =>
      buildUnserializedTransaction({
        txParams: {
          nonce: '0x0',
          gasPrice: '0x64',
          gas: '0x5208',
          to: '0x0000000000000000000000000000000000000000',
          value: '0x0',
          data: '0x',
        },
      })
    ).toThrow('buildUnserializedTransaction requires a valid chainId');
  });

  it('serializes pre-sign EIP-7702 revoke transactions for L1 fee estimation', () => {
    const unserializedTransaction = buildUnserializedTransaction({
      txParams: {
        type: '0x4',
        chainId: '0xa',
        nonce: '0x1',
        gas: '0xea60',
        maxFeePerGas: '0x64',
        maxPriorityFeePerGas: '0x64',
        to: '0x0000000000000000000000000000000000000000',
        value: '0x0',
        data: '0x',
        authorizationList: [
          [10, '0x0000000000000000000000000000000000000000', 1],
        ],
      },
    });

    expect(unserializedTransaction.toJSON()).toMatchObject({
      type: '0x4',
      chainId: '0xa',
      nonce: '0x1',
      gasLimit: '0xea60',
      maxFeePerGas: '0x64',
      maxPriorityFeePerGas: '0x64',
      authorizationList: [
        {
          chainId: '0xa',
          address: '0x0000000000000000000000000000000000000000',
          nonce: '0x1',
          yParity: '0x',
        },
      ],
    });

    expect(() => unserializedTransaction.serialize()).not.toThrow();
  });
});
