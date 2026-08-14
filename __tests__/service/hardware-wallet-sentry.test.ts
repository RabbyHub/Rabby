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
  it('does not wrap non-hardware keyrings in a promise', () => {
    const signature = { v: 27 };

    expect(
      withHardwareSigningContext(
        { type: 'HD Key Tree' },
        'transaction',
        () => signature
      )
    ).toBe(signature);
  });

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

      expect(getHardwareSigningContext(error)).toMatchObject({
        wallet,
        operation,
        originalError: error,
      });
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

  test.each([
    KEYRING_CLASS.HARDWARE.LEDGER,
    KEYRING_CLASS.HARDWARE.ONEKEY,
    KEYRING_CLASS.HARDWARE.TREZOR,
  ])('keeps generic network failures for %s', async (type) => {
    const error = new Error(
      'HttpRequestError: request failed with status code 502'
    );

    await expect(
      withHardwareSigningContext({ type }, 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(shouldIgnoreSentryError(error)).toBe(false);
  });

  it('keeps the original hardware error and device metadata', async () => {
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
    expect(event.extra.hardware_original_error).toContain('[redacted-hex]');
    expect(event.extra.hardware_original_error).not.toContain('token=secret');
    expect(event.exception.values[0].value).toContain('[redacted-hex]');
    expect(event.exception.values[0].value).not.toContain(address);
    expect(error.message).toContain(address);
  });

  it('reports Ledger metadata and the original SDK cause', async () => {
    const sdkError = { code: '0x6a80', message: 'invalid data for 0xabc' };
    const error = Object.assign(new Error('Ledger signing failed'), {
      cause: sdkError,
    });
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.LEDGER,
      getHardwareSigningMetadata: () => ({
        device_model: 'Nano X',
        firmware_version: '2.2.3',
        app_name: 'Ethereum',
        app_version: '1.10.0',
      }),
    };

    await expect(
      withHardwareSigningContext(keyring, 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(captureThroughBeforeSend(error)).toMatchObject({
      extra: {
        hardware_device: {
          device_model: 'Nano X',
          firmware_version: '2.2.3',
          app_name: 'Ethereum',
          app_version: '1.10.0',
        },
        hardware_original_error:
          'invalid data for 0xabc | 0x6a80 | {"code":"0x6a80","message":"invalid data for 0xabc"}',
      },
    });
  });

  it('drops a cancellation carried only by the SDK error code', async () => {
    const error = Object.assign(new Error('Ledger signing failed'), {
      cause: { code: '0x6985' },
    });

    await expect(
      withHardwareSigningContext(
        { type: KEYRING_CLASS.HARDWARE.LEDGER },
        'transaction',
        () => Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(shouldIgnoreSentryError(error)).toBe(true);
  });

  it('reports OneKey metadata captured during signing', async () => {
    const error = new Error('OneKey signing failed');
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.ONEKEY,
      metadata: {} as Record<string, string>,
      getHardwareSigningMetadata() {
        return this.metadata;
      },
    };

    await expect(
      withHardwareSigningContext(keyring, 'transaction', () => {
        // the keyring only learns the device once it talks to it
        keyring.metadata = {
          device_model: 'pro',
          firmware_version: '4.10.0',
        };
        return Promise.reject(error);
      })
    ).rejects.toBe(error);

    expect(captureThroughBeforeSend(error)).toMatchObject({
      extra: {
        hardware_device: { device_model: 'pro', firmware_version: '4.10.0' },
      },
    });
  });

  it('reports Trezor metadata from its bridge', async () => {
    const error = new Error('Trezor signing failed');
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.TREZOR,
      bridge: {
        getHardwareSigningMetadata: () => ({
          device_model: 'T2T1',
          firmware_version: '2.8.7',
        }),
      },
      getModel: () => 'T',
    };

    await expect(
      withHardwareSigningContext(keyring, 'typed_data', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(captureThroughBeforeSend(error)).toMatchObject({
      extra: {
        hardware_device: { device_model: 'T2T1', firmware_version: '2.8.7' },
      },
    });
  });

  it('keeps the signing error when reading metadata throws', async () => {
    const error = new Error('device failed');
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.TREZOR,
      getModel: () => {
        throw new TypeError(
          "Cannot read properties of undefined (reading 'model')"
        );
      },
    };

    await expect(
      withHardwareSigningContext(keyring, 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(getHardwareSigningContext(error)).toMatchObject({
      wallet: 'trezor',
      metadata: undefined,
    });
  });

  it('falls back to the Trezor model when the bridge has no metadata', async () => {
    const error = new Error('Trezor signing failed');
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.TREZOR,
      bridge: { model: 'T' },
      getModel: () => 'T',
    };

    await expect(
      withHardwareSigningContext(keyring, 'message', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(captureThroughBeforeSend(error)).toMatchObject({
      extra: { hardware_device: { device_model: 'T' } },
    });
  });

  // The keyring supplies the status word; nothing here re-derives it from
  // message text. A keyring that reports one gets its own fingerprint bucket.
  const ledgerReporting = (statusWord?: string) => ({
    type: KEYRING_CLASS.HARDWARE.LEDGER,
    getHardwareSigningMetadata: () => ({ status_word: statusWord }),
  });

  it('groups a hardware failure by the status word the keyring reports', async () => {
    const error = new Error('Ledger: Unknown error while signing transaction');

    await expect(
      withHardwareSigningContext(ledgerReporting('6a80'), 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(captureThroughBeforeSend(error)).toMatchObject({
      tags: { device_status_word: '6a80' },
      fingerprint: [
        'hardware-wallet-signing',
        'ledger',
        'transaction',
        '6a80',
        '{{ default }}',
      ],
    });
  });

  it('separates two status words that share a message', async () => {
    const fingerprintFor = async (statusWord: string) => {
      const error = new Error(
        'Ledger: Unknown error while signing transaction'
      );
      await expect(
        withHardwareSigningContext(
          ledgerReporting(statusWord),
          'transaction',
          () => Promise.reject(error)
        )
      ).rejects.toBe(error);
      return captureThroughBeforeSend(error).fingerprint;
    };

    expect(await fingerprintFor('6a80')).not.toEqual(
      await fingerprintFor('6d00')
    );
  });

  // Hex in the message must never become a status word. Scraping it out of the
  // text is what produced wrong tags, and it also split the bucket of every
  // wallet that does not speak in status words at all.
  test.each([
    [
      'a Ledger error carrying hex but no reported status word',
      ledgerReporting(undefined),
      'Ledger: signing failed 0x6a80, transport said 0x5515',
    ],
    [
      'a keyring that reports no metadata',
      { type: KEYRING_CLASS.HARDWARE.LEDGER },
      'Ledger: Account 0x0123456789abcdef0123456789abcdef01234567 is unknown',
    ],
    [
      'a wallet that does not speak in status words',
      { type: KEYRING_CLASS.HARDWARE.TREZOR },
      'Trezor: chain 0x2105 is not supported',
    ],
  ])('keeps the default grouping for %s', async (_label, keyring, message) => {
    const error = new Error(message);

    await expect(
      withHardwareSigningContext(keyring, 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    const event = captureThroughBeforeSend(error);
    expect(event.tags.device_status_word).toBeUndefined();
    expect(event.fingerprint).toEqual([
      'hardware-wallet-signing',
      event.tags.hardware_wallet,
      'transaction',
      '{{ default }}',
    ]);
  });

  // The keyring shape-checks it, but this is the boundary that writes it into
  // a fingerprint, and metadata arrives from a duck-typed keyring.
  test.each([
    ['a non-hex value', 'not-a-word'],
    ['an over-long value', 'deadbeefdeadbeef'],
    ['a non-string value', 1234 as any],
  ])('ignores %s reported as a status word', async (_label, statusWord) => {
    const error = new Error('Ledger signing failed');
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.LEDGER,
      getHardwareSigningMetadata: () => ({ status_word: statusWord }),
    };

    await expect(
      withHardwareSigningContext(keyring, 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    const event = captureThroughBeforeSend(error);
    expect(event.tags.device_status_word).toBeUndefined();
    expect(event.extra.hardware_device).toEqual({});
    expect(event.fingerprint).toEqual([
      'hardware-wallet-signing',
      'ledger',
      'transaction',
      '{{ default }}',
    ]);
  });

  it('drops metadata reported outside the hardware allowlist', async () => {
    const error = new Error('Ledger signing failed');
    const address = '0x0123456789abcdef0123456789abcdef01234567';
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.LEDGER,
      getHardwareSigningMetadata: () => ({
        device_model: 'Nano S Plus',
        [address]: 'seen',
        extra: { owner: `sent from ${address}` },
        nested: { a: { b: { c: 'too deep' } } },
        counter: BigInt(7),
      }),
    };

    await expect(
      withHardwareSigningContext(keyring, 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    const { hardware_device } = captureThroughBeforeSend(error).extra;
    expect(hardware_device).toEqual({ device_model: 'Nano S Plus' });
  });

  it('reports the device action trace and session diagnostics', async () => {
    const error = new Error('Ledger: signing failed 0x6a80');
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.LEDGER,
      getHardwareSigningMetadata: () => ({
        device_model: 'Nano S Plus',
        app_name: 'Ethereum',
        status_word: '6a80',
        device_action_steps:
          'openApp@0ms > getAddress@41ms > buildContexts@88ms > signTransaction@5102ms',
        session_age_ms: 92311,
        session_action_count: 7,
        session_reused: true,
        ledger_action: 'signTx',
        ledger_action_status: 'error',
        ledger_action_duration_ms: 5021,
        ledger_web3_checks_opt_in_result: false,
        ledger_clear_signing_timeout_suspected: true,
      }),
    };

    await expect(
      withHardwareSigningContext(keyring, 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(captureThroughBeforeSend(error)).toMatchObject({
      tags: {
        device_status_word: '6a80',
        ledger_clear_signing_timeout_suspected: 'true',
      },
      extra: {
        hardware_device: {
          device_action_steps:
            'openApp@0ms > getAddress@41ms > buildContexts@88ms > signTransaction@5102ms',
          session_age_ms: 92311,
          session_action_count: 7,
          session_reused: true,
          ledger_action: 'signTx',
          ledger_action_status: 'error',
          ledger_action_duration_ms: 5021,
          ledger_web3_checks_opt_in_result: false,
          ledger_clear_signing_timeout_suspected: true,
        },
      },
    });
  });
});
