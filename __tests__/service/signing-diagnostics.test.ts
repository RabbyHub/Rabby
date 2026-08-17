import {
  getSigningContext,
  applySigningContext,
  shouldIgnoreSentryError,
} from '@/utils/sentry';
import {
  registerSigningDiagnosticsProvider,
  withSigningDiagnostics,
} from '@/background/service/keyring/signing-diagnostics';

describe('signing diagnostics port', () => {
  it('keeps successful signing behavior unchanged', () => {
    const result = { serialized: '0x01' };

    expect(
      withSigningDiagnostics(
        { type: 'HD Key Tree' },
        'transaction',
        () => result
      )
    ).toBe(result);
  });

  test.each([
    'transaction',
    'personal_message',
    'typed_data',
    'eip7702_authorization',
  ] as const)(
    'attaches a bounded failure envelope for %s',
    async (operation) => {
      const error = new Error('Network Error');

      await expect(
        withSigningDiagnostics({ type: 'Future Wallet' }, operation, () =>
          Promise.reject(error)
        )
      ).rejects.toBe(error);

      expect(getSigningContext(error)).toMatchObject({
        schema_version: 1,
        wallet_family: 'unknown',
        wallet_provider: 'unknown',
        transport: 'unknown',
        operation,
        stage: 'unknown',
        outcome: 'failed',
        error_category: 'unknown',
      });

      const event: any = {};
      applySigningContext(event, error);
      expect(event.tags).toMatchObject({
        schema_version: 1,
        wallet_family: 'unknown',
        sign_operation: operation,
        sign_outcome: 'failed',
        error_category: 'unknown',
      });
      expect(event.message).toBe('unknown signing failed');
      expect(event.exception).toEqual({
        values: [{ type: 'SigningError', value: 'unknown' }],
      });
      expect(event.extra).toEqual({});
    }
  );

  it('keeps a known family separate from provider identity', async () => {
    const error = new Error('failed');
    await expect(
      withSigningDiagnostics({ type: 'WalletConnect' }, 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);
    expect(getSigningContext(error)).toMatchObject({
      wallet_family: 'walletconnect',
      wallet_provider: 'unknown',
    });
  });

  it('uses explicit provider capabilities and bounded categories', async () => {
    let receivedAttempt;
    registerSigningDiagnosticsProvider(
      'test-wallet',
      (_keyring, _error, attempt) => {
        receivedAttempt = attempt;
        return {
          wallet_provider: 'test-wallet',
          transport: 'bluetooth',
          error_category: 'timeout',
          provider_code: '90',
          provider_reason: 'test timeout',
        };
      }
    );
    const error = new Error('failed');

    await expect(
      withSigningDiagnostics(
        { type: 'Future Hardware', signingDiagnosticsProvider: 'test-wallet' },
        'transaction',
        () => Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(getSigningContext(error)).toMatchObject({
      wallet_family: 'hardware',
      wallet_provider: 'test-wallet',
      transport: 'bluetooth',
      error_category: 'timeout',
      provider_code: '90',
      provider_reason: 'test timeout',
    });
    expect(receivedAttempt).toMatchObject({
      operation: 'transaction',
      stage: 'unknown',
    });
    expect(receivedAttempt?.startedAt).toEqual(expect.any(Number));
  });

  it('captures the canonical stage updated by the signing seam', async () => {
    const error = new Error('failed during preparation');

    await expect(
      withSigningDiagnostics(
        { type: 'Future Wallet' },
        'transaction',
        (attempt) => {
          attempt.setStage('prepare');
          return Promise.reject(error);
        }
      )
    ).rejects.toBe(error);

    expect(getSigningContext(error)?.stage).toBe('prepare');
  });

  it('passes the stage reporter to keyring attempt ownership', async () => {
    const error = new Error('failed during connection');
    let signingAttempt;

    await expect(
      withSigningDiagnostics(
        {
          type: 'Future Hardware',
          beginSigningAttempt: (_operation, _address, reporter) => {
            signingAttempt = reporter;
            return undefined;
          },
        },
        'transaction',
        () => {
          signingAttempt?.setStage('connect');
          return Promise.reject(error);
        }
      )
    ).rejects.toBe(error);

    expect(getSigningContext(error)?.stage).toBe('connect');
  });

  it('keeps provider metadata behind its provider allowlist', async () => {
    registerSigningDiagnosticsProvider('test-trezor', () => ({
      wallet_provider: 'trezor',
      provider_metadata: {
        device_model: 'safe-model',
        status_word: '0x6a80',
        device_action_steps: 'secret-step',
      },
    }));
    const error = new Error('failed');

    await expect(
      withSigningDiagnostics(
        { type: 'Future Hardware', signingDiagnosticsProvider: 'test-trezor' },
        'transaction',
        () => Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(getSigningContext(error)?.provider_metadata).toEqual({
      device_model: 'safe-model',
    });
  });

  it.each([
    ['Onekey Hardware', 'onekey', 'usb'],
    ['Trezor Hardware', 'trezor', 'usb'],
  ])(
    'uses the built-in %s adapter without Ledger classification',
    async (type, provider, transport) => {
      const error = new Error('0x6a80 device rejected');
      await expect(
        withSigningDiagnostics(
          {
            type,
            signingDiagnosticsProvider: provider,
            getSigningDiagnostics: () => ({
              wallet_provider: provider,
              transport,
              error_category: 'unknown',
              provider_metadata: { device_model: 'safe-model' },
            }),
          },
          'transaction',
          () => Promise.reject(error)
        )
      ).rejects.toBe(error);
      expect(getSigningContext(error)).toMatchObject({
        wallet_provider: provider,
        transport,
        provider_metadata: { device_model: 'safe-model' },
      });
      expect(getSigningContext(error)?.provider_code).toBeUndefined();
    }
  );

  it('falls back to unknown for malformed provider values', async () => {
    registerSigningDiagnosticsProvider('bad-wallet', () => ({
      wallet_provider: 'address-0x1234567890123456789012345678901234567890',
      transport: 'satellite',
      error_category: 'made-up',
      provider_code: 'x'.repeat(1000),
      provider_reason: { secret: 'must not escape' },
    }));
    const error = new Error('failed');

    await expect(
      withSigningDiagnostics(
        { type: 'Future Hardware', signingDiagnosticsProvider: 'bad-wallet' },
        'transaction',
        () => Promise.reject(error)
      )
    ).rejects.toBe(error);

    expect(getSigningContext(error)).toMatchObject({
      wallet_provider: 'unknown',
      transport: 'unknown',
      error_category: 'unknown',
    });
    expect(getSigningContext(error)?.provider_code).toBeUndefined();
  });

  it.each([
    ['BitBox02 Hardware', 'bitbox02'],
    ['imKey Hardware', 'imkey'],
    ['GridPlus Hardware', 'gridplus'],
    ['WalletConnect', 'walletconnect'],
    ['Gnosis', 'gnosis'],
    ['Coinbase', 'coinbase'],
  ])('covers the remaining provider family %s', async (type, provider) => {
    const error = new Error('provider rejected 0x6a80');
    await expect(
      withSigningDiagnostics(
        { type, signingDiagnosticsProvider: provider },
        'transaction',
        () => Promise.reject(error)
      )
    ).rejects.toBe(error);
    expect(getSigningContext(error)).toMatchObject({
      wallet_provider: provider,
      transport: 'unknown',
      error_category: 'unknown',
    });
  });

  it.each([
    ['Simple Key Pair', 'private_key', 'decrypt_failed'],
    ['HD Key Tree', 'mnemonic', 'derivation_failed'],
  ])('classifies software failure %s', async (type, provider, category) => {
    const error = Object.assign(new Error('safe'), {
      error_category: category,
    });
    await expect(
      withSigningDiagnostics(
        { type, signingDiagnosticsProvider: provider },
        'transaction',
        () => Promise.reject(error)
      )
    ).rejects.toBe(error);
    expect(getSigningContext(error)).toMatchObject({
      wallet_provider: provider,
      error_category: category,
    });
  });

  it.each([
    ['Keystone', 'keystone'],
    ['NGRAVE ZERO', 'ngravezero'],
  ])('keeps QR provider identity separate for %s', async (brand, provider) => {
    const error = new Error('QR device rejected 0x6a80');
    await expect(
      withSigningDiagnostics(
        {
          type: 'QR Hardware Wallet Device',
          getSigningDiagnostics: () => ({
            wallet_provider: provider,
            transport: 'qr',
            error_category: 'unknown',
          }),
        },
        'transaction',
        () => Promise.reject(error),
        '0xabc'
      )
    ).rejects.toBe(error);
    expect(getSigningContext(error)).toMatchObject({
      wallet_provider: provider,
      transport: 'qr',
    });
    expect(getSigningContext(error)?.provider_code).toBeUndefined();
  });

  it('does not let concurrent attempts overwrite one error context', async () => {
    const error = new Error('shared failure');
    const first = withSigningDiagnostics(
      { type: 'HD Key Tree' },
      'transaction',
      () => Promise.reject(error)
    );
    const second = withSigningDiagnostics(
      { type: 'WalletConnect' },
      'typed_data',
      () => Promise.reject(error)
    );

    const [firstResult, secondResult] = await Promise.allSettled([
      first,
      second,
    ]);
    expect(firstResult.status).toBe('rejected');
    expect(secondResult.status).toBe('rejected');
    expect(
      getSigningContext((firstResult as PromiseRejectedResult).reason)
    ).toMatchObject({ wallet_family: 'software', operation: 'transaction' });
    expect(
      getSigningContext((secondResult as PromiseRejectedResult).reason)
    ).toMatchObject({
      wallet_family: 'walletconnect',
      operation: 'typed_data',
    });
  });

  it('filters an explicitly classified cancellation', async () => {
    const error = Object.assign(new Error('cancelled'), {
      category: 'user_cancelled',
    });
    await expect(
      withSigningDiagnostics({ type: 'HD Key Tree' }, 'transaction', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);
    expect(shouldIgnoreSentryError(error)).toBe(true);
  });

  it('preserves primitive rejections while reporting an error carrier', async () => {
    await expect(
      withSigningDiagnostics(
        { type: 'BitBox02 Hardware', signingDiagnosticsProvider: 'bitbox02' },
        'transaction',
        () => Promise.reject('Unsupported device')
      )
    ).rejects.toBe('Unsupported device');

    let attemptError: unknown;
    await withSigningDiagnostics(
      {
        type: 'BitBox02 Hardware',
        signingDiagnosticsProvider: 'bitbox02',
        endSigningAttempt: (_attempt, error) => {
          attemptError = error;
        },
      },
      'transaction',
      () => Promise.reject('Unsupported device')
    ).catch(() => undefined);
    expect(getSigningContext(attemptError)).toMatchObject({
      wallet_provider: 'bitbox02',
      outcome: 'failed',
    });
  });

  it('passes the primitive rejection carrier through attempt diagnostics', async () => {
    let diagnosticsError: unknown;
    const rejection = await withSigningDiagnostics(
      {
        type: 'QR Hardware Wallet Device',
        beginSigningAttempt: () => ({}),
        endSigningAttempt: (_attempt, attemptError) => {
          diagnosticsError = attemptError;
        },
        getSigningDiagnostics: (attemptError) => ({
          wallet_provider:
            attemptError === diagnosticsError ? 'keystone' : 'ngravezero',
          transport: 'qr',
          error_category: 'unknown',
        }),
      },
      'transaction',
      () => Promise.reject('QR device rejected')
    ).catch((attemptError) => attemptError);

    expect(rejection).toBe('QR device rejected');
    expect(diagnosticsError).toBeInstanceOf(Error);
    expect(getSigningContext(diagnosticsError)).toMatchObject({
      wallet_provider: 'keystone',
      transport: 'qr',
    });
  });

  it('does not allow non-hardware providers to pass hardware metadata', async () => {
    const error = new Error('failed');
    await expect(
      withSigningDiagnostics(
        {
          type: 'WalletConnect',
          signingDiagnosticsProvider: 'walletconnect',
          getSigningDiagnostics: () => ({
            wallet_provider: 'walletconnect',
            provider_metadata: { device_model: 'must-drop' },
          }),
        },
        'transaction',
        () => Promise.reject(error)
      )
    ).rejects.toBe(error);
    expect(getSigningContext(error)?.provider_metadata).toBeUndefined();
  });
});
