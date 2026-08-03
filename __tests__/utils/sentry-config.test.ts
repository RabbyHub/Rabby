jest.mock('@/utils/env', () => ({
  getSentryEnv: () => 'test',
}));
jest.mock('@/utils/user-data-tracking', () => ({
  shouldReportUserBehaviorData: jest.fn().mockResolvedValue(true),
}));

import * as Sentry from '@sentry/browser';
import { getSentryConfig } from '@/utils/sentry-config';
import { attachHardwareSigningContext } from '@/utils/sentry';

describe('Sentry configuration', () => {
  const config = getSentryConfig();

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
    const pipelineConfig = getSentryConfig();
    expect(pipelineConfig.ignoreErrors).toBeDefined();

    const client = new Sentry.BrowserClient({
      ...pipelineConfig,
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
    });
    const transactionError = new Error('OneKey transaction failed');
    attachHardwareSigningContext(transactionError, {
      wallet: 'onekey',
      operation: 'transaction',
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
    await client.flush(2000);

    expect(events).toHaveLength(4);
    expect(events[0].tags).toMatchObject({ hardware_wallet: 'trezor' });
    expect(events[1].tags).toMatchObject({ hardware_wallet: 'ledger' });
    expect(events[2].tags).toMatchObject({ hardware_wallet: 'onekey' });
    expect(events[2].exception?.values?.[0]?.value).toBe(
      'OneKey transaction failed'
    );
    expect(events[3].tags?.hardware_wallet).toBeUndefined();
    await client.close(2000);
  });
});
