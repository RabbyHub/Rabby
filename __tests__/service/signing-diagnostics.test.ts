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
        stage: 'sign',
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
      expect(event.extra.signing_original_error).toContain('Network Error');
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
    registerSigningDiagnosticsProvider('test-wallet', () => ({
      wallet_provider: 'test-wallet',
      transport: 'bluetooth',
      error_category: 'timeout',
      provider_code: '90',
    }));
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
    });
  });

  it.each([
    ['Onekey Hardware', 'onekey', 'webhid'],
    ['Trezor Hardware', 'trezor', 'usb'],
  ])(
    'uses the built-in %s adapter without Ledger classification',
    async (type, provider, transport) => {
      const error = new Error('0x6a80 device rejected');
      await expect(
        withSigningDiagnostics(
          {
            type,
            getHardwareSigningMetadata: () => ({ device_model: 'safe-model' }),
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
        () => Promise.reject(error)
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
});
