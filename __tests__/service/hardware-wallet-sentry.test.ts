jest.mock('@/constant', () => ({
  KEYRING_CLASS: {
    PRIVATE_KEY: 'Simple Key Pair',
    HARDWARE: {
      TREZOR: 'Trezor Hardware',
      LEDGER: 'Ledger Hardware',
      ONEKEY: 'Onekey Hardware',
    },
  },
}));

import { withHardwareSigningContext } from '@/background/service/keyring/hardware-wallet-sentry';
import { KEYRING_CLASS } from '@/constant';
import {
  applyHardwareSigningContext,
  getHardwareSigningContext,
  shouldIgnoreSentryError,
} from '@/utils/sentry';

const captureThroughBeforeSend = (error: unknown) => {
  if (shouldIgnoreSentryError(error)) {
    return null;
  }

  const event: any = {
    exception: {
      values: [{ value: (error as any)?.message ?? String(error) }],
    },
  };
  applyHardwareSigningContext(event, error);
  return event;
};

describe('hardware wallet Sentry reporting', () => {
  test.each([
    [KEYRING_CLASS.HARDWARE.LEDGER, 'ledger', 'transaction'],
    [KEYRING_CLASS.HARDWARE.ONEKEY, 'onekey', 'personal_message'],
    [KEYRING_CLASS.HARDWARE.TREZOR, 'trezor', 'typed_data'],
  ] as const)(
    'reports %s failures with wallet and operation',
    async (type, wallet, operation) => {
      const error = new Error('device failed');

      await expect(
        withHardwareSigningContext({ type }, operation, () =>
          Promise.reject(error)
        )
      ).rejects.toBe(error);

      expect(getHardwareSigningContext(error)).toEqual({ wallet, operation });
      expect(captureThroughBeforeSend(error)).toMatchObject({
        tags: {
          hardware_wallet: wallet,
          sign_operation: operation,
        },
        fingerprint: [
          'hardware-wallet-signing',
          wallet,
          operation,
          '{{ default }}',
        ],
      });
    }
  );

  it('reports synchronous throws and preserves the original error', () => {
    const error = new Error('device failed');

    expect(() =>
      withHardwareSigningContext(
        { type: KEYRING_CLASS.HARDWARE.LEDGER },
        'eip7702_authorization',
        () => {
          throw error;
        }
      )
    ).toThrow(error);
  });

  test.each([KEYRING_CLASS.PRIVATE_KEY, 'BitBox02 Hardware'])(
    'leaves non-target keyring %s untouched',
    (type) => {
      const error = new Error('software failure');

      expect(() =>
        withHardwareSigningContext({ type }, 'transaction', () => {
          throw error;
        })
      ).toThrow(error);

      expect(getHardwareSigningContext(error)).toBeUndefined();
    }
  );

  it('does not apply hardware ignore rules to non-target keyrings', () => {
    const error = new Error(
      'Only version 4 of typed data signing is supported. Provided version: V3'
    );

    expect(() =>
      withHardwareSigningContext(
        { type: 'BitBox02 Hardware' },
        'typed_data',
        () => {
          throw error;
        }
      )
    ).toThrow(error);
    expect(shouldIgnoreSentryError(error)).toBe(false);
  });

  it('attaches context to plain-object SDK failures without mutating them', async () => {
    const error = { message: 'device failed', payload: 'signing-data' };

    await expect(
      withHardwareSigningContext(
        { type: KEYRING_CLASS.HARDWARE.ONEKEY },
        'transaction',
        () => Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(getHardwareSigningContext(error)?.wallet).toBe('onekey');
    expect(error).toEqual({
      message: 'device failed',
      payload: 'signing-data',
    });
  });

  test.each([
    [KEYRING_CLASS.HARDWARE.LEDGER, new Error('Ledger error 0x6985')],
    [KEYRING_CLASS.HARDWARE.ONEKEY, new Error('803: Operation cancelled')],
    [
      KEYRING_CLASS.HARDWARE.ONEKEY,
      new Error('{"code":803,"errorMsg":"803: Operation cancelled"}'),
    ],
    [KEYRING_CLASS.HARDWARE.TREZOR, new Error('Error: Cancelled')],
  ])('drops confirmed %s cancellation', async (type, error) => {
    await expect(
      withHardwareSigningContext({ type }, 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(shouldIgnoreSentryError(error)).toBe(true);
  });

  test.each([KEYRING_CLASS.HARDWARE.LEDGER, KEYRING_CLASS.HARDWARE.ONEKEY])(
    'keeps the broad HTTP filter for %s',
    async (type) => {
      const error = new Error('request to https://device.example failed');

      await expect(
        withHardwareSigningContext({ type }, 'transaction', () =>
          Promise.reject(error)
        )
      ).rejects.toBe(error);

      expect(shouldIgnoreSentryError(error)).toBe(true);
    }
  );

  it('keeps and redacts a real Trezor Bridge failure', async () => {
    const address = '0x0123456789abcdef0123456789abcdef01234567';
    const error = new Error(
      `bridge http://127.0.0.1:21325/call?token=secret failed for ${address}`
    );

    await expect(
      withHardwareSigningContext(
        { type: KEYRING_CLASS.HARDWARE.TREZOR },
        'typed_data',
        () => Promise.reject(error)
      )
    ).rejects.toBe(error);

    const event = captureThroughBeforeSend(error);
    expect(event).not.toBeNull();
    expect(event.tags.hardware_wallet).toBe('trezor');
    expect(event.exception.values[0].value).toBe(
      'bridge http://127.0.0.1:21325/call failed for [redacted-hex]'
    );
    expect(error.message).toContain(address);
  });
});
