jest.mock('@/utils/env', () => ({
  getSentryEnv: () => 'test',
}));
jest.mock('@/utils/user-data-tracking', () => ({
  shouldReportUserBehaviorData: jest.fn().mockResolvedValue(true),
}));

import * as Sentry from '@sentry/browser';
import { SENTRY_IGNORED_SAMPLES } from '../fixtures/sentry-ignored-samples';
import { getSentryConfig } from '@/utils/sentry-config';
import { applySigningContext, attachSigningContext } from '@/utils/sentry';
import type { SigningOperation } from '@/background/service/keyring/signing-diagnostics';

const attachHardwareSigningContext = (
  error: unknown,
  context: {
    wallet: string;
    operation: string;
    originalError?: unknown;
    error_category?: 'user_cancelled' | 'unknown';
    provider_code?: string;
    provider_error_tag?: string;
    provider_stage?: string;
    provider_reason?: string;
    provider_metadata?: Record<string, string | number | boolean>;
  }
) =>
  attachSigningContext(error, {
    schema_version: 1,
    wallet_family: 'hardware',
    wallet_provider: context.wallet,
    transport: 'unknown',
    operation: (context.operation === 'message'
      ? 'personal_message'
      : context.operation) as SigningOperation,
    stage: 'sign',
    outcome: 'failed',
    error_category: context.error_category ?? 'unknown',
    duration_bucket: 'lt_100ms',
    provider_code: context.provider_code,
    provider_error_tag: context.provider_error_tag,
    provider_stage: context.provider_stage,
    provider_reason: context.provider_reason,
    provider_metadata: context.provider_metadata,
    originalError: context.originalError,
  });

const createRecordingClient = (events: any[]) => {
  const client = new Sentry.BrowserClient({
    ...getSentryConfig(),
    integrations: [Sentry.eventFiltersIntegration()],
    stackParser: Sentry.defaultStackParser,
    sendClientReports: false,
    transport: () =>
      ({
        send: async (envelope) => {
          envelope[1].forEach(([header, event]) => {
            if (header.type === 'event') {
              events.push(event);
            }
          });
          return { statusCode: 200 };
        },
        flush: async () => true,
      } as any),
  });
  client.init();
  const scope = new Sentry.Scope();
  scope.setClient(client);
  return { client, scope };
};

describe('Sentry configuration', () => {
  const config = getSentryConfig();

  test('preserves the parsed stacktrace when canonicalizing signing errors', () => {
    const error = new Error('device failed');
    attachHardwareSigningContext(error, {
      wallet: 'ledger',
      operation: 'transaction',
    });
    const stacktrace = { frames: [{ filename: 'signer.ts', lineno: 42 }] };
    const event: any = {
      exception: {
        values: [{ type: 'Error', value: error.message, stacktrace }],
      },
    };

    applySigningContext(event, error);

    expect(event.exception.values[0]).toMatchObject({
      type: 'SigningError',
      value: 'unknown',
      stacktrace,
    });
  });

  test('uses the safe provider code in the canonical exception and grouping', () => {
    const error = new Error('device failed');
    attachHardwareSigningContext(error, {
      wallet: 'ledger',
      operation: 'transaction',
      provider_code: '0x6985',
      provider_error_tag: 'EthAppCommandError',
      provider_stage: 'signer.eth.steps.signTransaction',
      provider_reason: 'condition_not_satisfied',
      provider_metadata: {
        status_word: '0x6985',
        last_required_user_interaction: 'sign-transaction',
        used_fallback: false,
      },
    });
    const event: any = {
      exception: { values: [{ type: 'Error', value: error.message }] },
    };

    applySigningContext(event, error);

    expect(event.exception.values[0]).toMatchObject({
      type: 'SigningError',
      value: '0x6985',
    });
    expect(event.tags).toMatchObject({
      signing_provider_code: '0x6985',
      signing_provider_error_tag: 'EthAppCommandError',
      signing_provider_stage: 'signer.eth.steps.signTransaction',
    });
    expect(event.fingerprint).toContain('0x6985');
    expect(event.extra).toMatchObject({
      signing_provider_code: '0x6985',
      signing_provider_error_tag: 'EthAppCommandError',
      signing_provider_reason: 'condition_not_satisfied',
      signing_provider_metadata: {
        last_required_user_interaction: 'sign-transaction',
        used_fallback: false,
      },
    });
  });

  test('keeps automatic session tracking disabled', () => {
    const filterIntegrations = config.integrations as (
      defaultIntegrations: Array<{ name: string }>
    ) => Array<{ name: string }>;
    const integrations = filterIntegrations([
      { name: 'BrowserSession' },
      { name: 'GlobalHandlers' },
      { name: 'LinkedErrors' },
    ]);

    expect(integrations).toEqual([
      { name: 'GlobalHandlers' },
      { name: 'LinkedErrors' },
    ]);
  });

  test('drops sensitive UI breadcrumbs and sanitizes request URLs', () => {
    expect(config.beforeBreadcrumb?.({ category: 'console' })).toBeNull();
    expect(config.beforeBreadcrumb?.({ category: 'ui.click' })).toBeNull();
    expect(
      config.beforeBreadcrumb?.({
        category: 'fetch',
        data: {
          url:
            'https://api.example/0x0123456789abcdef0123456789abcdef01234567?token=secret',
          to:
            'chrome-extension://rabby/index.html#/address/0x0123456789abcdef0123456789abcdef01234567',
        },
      })
    ).toEqual({
      category: 'fetch',
      data: {
        url: 'https://api.example/[redacted]',
        to: 'chrome-extension://rabby/index.html',
      },
    });
  });

  test('keeps and deduplicates hardware HTTP failures through Sentry', async () => {
    const events: any[] = [];
    // The ignore list must stay out of the SDK filter, which runs before
    // beforeSend and would drop hardware failures before the bypass applies.
    expect(getSentryConfig().ignoreErrors).toBeUndefined();

    const { client, scope } = createRecordingClient(events);

    const hardwareError = new Error(
      'bridge request to http://127.0.0.1:21325/call failed'
    );
    attachHardwareSigningContext(hardwareError, {
      wallet: 'trezor',
      operation: 'typed_data',
    });
    const hardwareObject = { message: 'ledger transport failed' };
    attachHardwareSigningContext(hardwareObject, {
      wallet: 'ledger',
      operation: 'transaction',
    });
    const cancelled = new Error('Ledger error 0x6985');
    attachHardwareSigningContext(cancelled, {
      wallet: 'ledger',
      operation: 'transaction',
      error_category: 'user_cancelled',
    });
    const transactionError = new Error('OneKey transaction failed');
    attachHardwareSigningContext(transactionError, {
      wallet: 'onekey',
      operation: 'transaction',
    });
    // A transport failure during signing reads like generic network noise;
    // it must still be reported because it carries a hardware context.
    const transportError = new Error('Failed to fetch');
    attachHardwareSigningContext(transportError, {
      wallet: 'ledger',
      operation: 'message',
      originalError: {
        code: '0x6a80',
        derivationPath: "m/44'/60'/0'/0/3",
        account: '0x0123456789abcdef0123456789abcdef01234567',
      },
    });
    const transactionClone = {
      message: transactionError.message,
      reportedFromBackground: true,
    };
    attachHardwareSigningContext(transactionClone, {
      wallet: 'onekey',
      operation: 'transaction',
    });

    scope.captureException(hardwareError);
    scope.captureException(hardwareError);
    scope.captureException(hardwareObject);
    scope.captureException(hardwareObject);
    scope.captureException(cancelled);
    scope.captureException(transactionError);
    scope.captureException(transportError);
    scope.captureException(transactionClone);
    scope.captureException(
      new Error(
        'Only version 4 of typed data signing is supported. Provided version: V3'
      )
    );
    scope.captureException(new Error('GET https://custom-rpc.example failed'));
    scope.captureException({
      message: 'already reported hardware error',
      reportedFromBackground: true,
    });
    scope.captureEvent({
      exception: {
        values: [
          {
            type: 'UnhandledRejection',
            value: 'Non-Error promise rejection captured with value: undefined',
          },
        ],
      },
    });
    // Patterns written against the joined "type: value" form, which is the
    // only place that text exists once Sentry has split the exception.
    scope.captureEvent({
      exception: {
        values: [{ type: 'NotAllowedError', value: 'Permission denied.' }],
      },
    });
    scope.captureEvent({
      exception: {
        values: [{ type: 'UnknownError', value: 'Internal error.' }],
      },
    });
    await client.flush(2000);

    expect(events).toHaveLength(4);
    expect(events[0].tags).toMatchObject({
      wallet_family: 'hardware',
      wallet_provider: 'trezor',
    });
    expect(events[1].tags).toMatchObject({
      wallet_family: 'hardware',
      wallet_provider: 'ledger',
    });
    expect(events[2].tags).toMatchObject({
      wallet_family: 'hardware',
      wallet_provider: 'onekey',
    });
    expect(events[2].tags).toMatchObject({
      wallet_family: 'hardware',
      wallet_provider: 'onekey',
    });
    expect(events[2].message).toBe('onekey signing failed');
    expect(events[2].exception?.values?.[0]).toMatchObject({
      type: 'SigningError',
      value: 'unknown',
    });
    expect(events[2].extra).toEqual({});
    expect(events[3].tags).toMatchObject({
      wallet_family: 'hardware',
      wallet_provider: 'ledger',
    });
    expect(events[3].message).toBe('ledger signing failed');
    expect(events[3].extra).toEqual({});
    await client.close(2000);
  });

  // shouldIgnoreSentryError returning true is not proof: the SDK matches text
  // that only exists on the event Sentry builds, so every sample is replayed
  // in each shape an error can reach the pipeline in.
  test('drops every ignored sample through the real pipeline', async () => {
    const events: any[] = [];
    const { client, scope } = createRecordingClient(events);

    SENTRY_IGNORED_SAMPLES.forEach((message) => {
      scope.captureException(new Error(message));
      scope.captureEvent({ message });

      const [type, ...rest] = message.split(': ');
      scope.captureEvent({
        exception: {
          values: rest.length
            ? [{ type, value: rest.join(': ') }]
            : [{ type: 'Error', value: message }],
        },
      });
    });
    await client.flush(2000);

    expect(
      events.map(
        (event) => event.message ?? event.exception?.values?.[0]?.value
      )
    ).toEqual([]);
    await client.close(2000);
  });
});
