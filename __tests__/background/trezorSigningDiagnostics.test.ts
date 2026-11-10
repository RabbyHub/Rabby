import TrezorOffscreenBridge from '@/background/service/keyring/eth-trezor-keyring/trezor-offscreen-bridge';
import { withSigningDiagnostics } from '@/background/service/keyring/signing-diagnostics';
import { TrezorAction } from '@/constant/offscreen-communication';
import {
  applySigningContext,
  getSigningContext,
  shouldIgnoreSentryError,
} from '@/utils/sentry';

const sendMessage = jest.fn();

jest.mock('webextension-polyfill', () => ({
  runtime: {
    id: 'rabby-test',
    sendMessage: (...args: unknown[]) => sendMessage(...args),
    onMessage: { addListener: jest.fn() },
  },
}));

// What the eth-trezor-keyring does with a failed Connect response.
const signLikeKeyring = async (bridge: TrezorOffscreenBridge) => {
  const response: any = await bridge.ethereumSignTransaction({} as any);
  if (!response.success) throw new Error(response.payload.error);
  return response;
};

let lastBridge: TrezorOffscreenBridge;

const failSigningWith = async (payload: { error: string; code?: string }) => {
  sendMessage.mockImplementation(async ({ action }) =>
    action === TrezorAction.ethereumSignTransaction
      ? { success: false, payload }
      : {}
  );
  const bridge = new TrezorOffscreenBridge();
  lastBridge = bridge;
  await bridge.init({} as any);
  const keyring = {
    type: 'Trezor Hardware',
    signingDiagnosticsProvider: 'trezor',
    bridge,
  };
  let error: unknown;
  await withSigningDiagnostics(keyring, 'transaction', () =>
    signLikeKeyring(bridge)
  ).catch((e) => {
    error = e;
  });
  return error;
};

describe('Trezor signing diagnostics', () => {
  beforeEach(() => sendMessage.mockReset());

  it('classifies a device rejection as a user cancellation and drops it', async () => {
    const error = await failSigningWith({
      error: 'Action cancelled by user',
      code: 'Failure_ActionCancelled',
    });
    expect(getSigningContext(error)).toMatchObject({
      wallet_provider: 'trezor',
      error_category: 'user_cancelled',
      provider_code: 'Failure_ActionCancelled',
    });
    expect(shouldIgnoreSentryError(error)).toBe(true);
  });

  it('keeps a real failure reportable and groups it by its Connect code', async () => {
    const error = await failSigningWith({
      error: 'Device disconnected',
      code: 'Device_Disconnected',
    });
    expect(getSigningContext(error)?.error_category).toBe('disconnected');
    expect(shouldIgnoreSentryError(error)).toBe(false);

    const event: any = {
      exception: { values: [{ type: 'Error', value: 'x' }] },
    };
    applySigningContext(event, error);
    expect(event.exception.values[0].value).toBe('Device_Disconnected');
    expect(event.fingerprint).toContain('Device_Disconnected');
    expect(event.tags.signing_provider_code).toBe('Device_Disconnected');
  });

  it('keeps an unmapped code as unknown but still splits on it', async () => {
    const error = await failSigningWith({
      error: 'Device is busy',
      code: 'Failure_Busy',
    });
    expect(getSigningContext(error)).toMatchObject({
      error_category: 'unknown',
      provider_code: 'Failure_Busy',
    });
  });

  it('does not send the Connect message, only the code', async () => {
    const error = await failSigningWith({
      error: 'Parameter "path" 0xabc is invalid',
      code: 'Method_InvalidParameter',
    });
    expect(getSigningContext(error)?.provider_reason).toBeUndefined();
  });

  it('falls back to the message when no code reaches the bridge', async () => {
    const error = new Error('Error: Popup closed');
    await withSigningDiagnostics(
      { type: 'Trezor Hardware', signingDiagnosticsProvider: 'trezor' },
      'transaction',
      () => Promise.reject(error)
    ).catch(() => undefined);
    expect(getSigningContext(error)).toMatchObject({
      error_category: 'user_cancelled',
      provider_code: 'Method_Interrupted',
    });
  });
  it("does not label a later failure with an earlier attempt's code", async () => {
    const cancelled = await failSigningWith({
      error: 'Action cancelled by user',
      code: 'Failure_ActionCancelled',
    });
    expect(getSigningContext(cancelled)?.error_category).toBe('user_cancelled');

    // The next attempt fails before reaching the bridge (as in getHdPath).
    const keyring = {
      type: 'Trezor Hardware',
      signingDiagnosticsProvider: 'trezor',
      bridge: lastBridge,
    };
    const error = new Error('Error: Unknown address');
    await withSigningDiagnostics(keyring, 'transaction', () =>
      Promise.reject(error)
    ).catch(() => undefined);
    expect(getSigningContext(error)).toMatchObject({
      error_category: 'unknown',
    });
    expect(getSigningContext(error)?.provider_code).toBeUndefined();
    expect(shouldIgnoreSentryError(error)).toBe(false);
  });

  it('reads a bare Connect cancel, but not "canceled" inside another message', async () => {
    const run = async (error: Error) => {
      await withSigningDiagnostics(
        { type: 'Trezor Hardware', signingDiagnosticsProvider: 'trezor' },
        'transaction',
        () => Promise.reject(error)
      ).catch(() => undefined);
      return getSigningContext(error)?.error_category;
    };
    expect(await run(new Error('Error: Canceled'))).toBe('user_cancelled');
    expect(await run(new Error('Request Canceled by server'))).toBe('unknown');
  });
});
