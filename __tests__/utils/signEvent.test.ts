import fs from 'fs';
import path from 'path';
import {
  createSigningOperation,
  isSameSigningOperation,
  isSignFinishedFor,
} from '@/utils/signEvent';

const account = {
  address: '0x57f2000000000000000000000000000000007758',
  type: 'HD Key Tree',
};

const createOperation = (id = 'operation-a') =>
  createSigningOperation({
    id,
    origin: 'https://origin-a.example',
    account,
    method: 'eth_signTypedData_v4',
    params: [account.address, '{"message":{"approved":true}}'],
  });

describe('signing operation binding', () => {
  it('accepts only the event carrying the complete same operation context', () => {
    const expected = createOperation();

    expect(
      isSignFinishedFor(
        { success: true, signingOperation: createOperation() },
        expected
      )
    ).toBe(true);
  });

  test.each([
    ['operation ID', { id: 'operation-b' }],
    ['origin', { origin: 'https://origin-b.example' }],
    [
      'account address',
      { accountAddress: '0xd553500000000000000000000000000000a533c0' },
    ],
    ['account type', { accountType: 'Simple Key Pair' }],
    ['payload commitment', { payloadHash: `0x${'00'.repeat(32)}` }],
  ])('rejects an event with a different %s', (_label, change) => {
    const expected = createOperation();
    const actual = { ...createOperation(), ...change };

    expect(isSameSigningOperation(actual, expected)).toBe(false);
    expect(
      isSignFinishedFor({ success: true, signingOperation: actual }, expected)
    ).toBe(false);
  });

  it('rejects missing or malformed operation metadata', () => {
    const expected = createOperation();

    expect(isSignFinishedFor({ success: true }, expected)).toBe(false);
    expect(
      isSignFinishedFor({ success: true, signingOperation: {} }, expected)
    ).toBe(false);
    expect(isSignFinishedFor({ success: true }, undefined)).toBe(false);
  });

  it('commits to the exact method and params', () => {
    const expected = createOperation();
    const otherPayload = createSigningOperation({
      id: 'operation-a',
      origin: 'https://origin-a.example',
      account,
      method: 'eth_signTypedData_v4',
      params: [account.address, '{"message":{"approved":false}}'],
    });

    expect(otherPayload.payloadHash).not.toBe(expected.payloadHash);
    expect(() => createOperation('')).toThrow('operation ID');
  });
});

describe('SIGN_FINISHED consumers', () => {
  const components = [
    'LedgerHardwareWaiting.tsx',
    'PrivatekeyWaiting.tsx',
    'CommonWaiting.tsx',
    'ImKeyHardwareWaiting.tsx',
    'CoinbaseWaiting/index.tsx',
    'WatchAddressWaiting/index.tsx',
    'QRHardWareWaiting/QRHardWareWaiting.tsx',
  ];

  test.each(components)(
    '%s filters events by its signing operation',
    (file) => {
      const source = fs.readFileSync(
        path.join(__dirname, '../../src/ui/views/Approval/components', file),
        'utf8'
      );

      expect(source).toContain(
        'isSignFinishedFor(data, params.signingOperation)'
      );
    }
  );
});
