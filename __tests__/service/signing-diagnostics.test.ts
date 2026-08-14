import { getSigningContext, applySigningContext } from '@/utils/sentry';
import { withSigningDiagnostics } from '@/background/service/keyring/signing-diagnostics';

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
});
