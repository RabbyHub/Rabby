jest.mock('@/utils/env', () => ({
  getSentryEnv: () => 'test',
}));
jest.mock('@/utils/user-data-tracking', () => ({
  shouldReportUserBehaviorData: jest.fn().mockResolvedValue(true),
}));

import * as Sentry from '@sentry/browser';
import { getSentryConfig } from '@/utils/sentry-config';
import { attachSigningContext } from '@/utils/sentry';

const HOUR_MS = 60 * 60 * 1000;
const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
const clockErrorMessage = (offset = 0) =>
  'WebSocket connection closed abnormally with code: 3000 ' +
  '(JWT validation error: JWT Token is not yet valid: ' +
  `basic.iat: ${1791353462 + offset}, ` +
  `now + time_leeway: ${1791353252 + offset}, time_leeway: 120)`;

describe('WalletConnect clock error Sentry rate limit', () => {
  let monotonicNow: number;
  const clients: Sentry.BrowserClient[] = [];

  const createRecordingClient = () => {
    const events: any[] = [];
    const config = getSentryConfig();
    const client = new Sentry.BrowserClient({
      ...config,
      dsn: config.dsn || TEST_DSN,
      integrations: [Sentry.eventFiltersIntegration()],
      stackParser: Sentry.defaultStackParser,
      sendClientReports: false,
      transport: () =>
        ({
          send: async (envelope) => {
            envelope[1].forEach(([header, event]) => {
              if (header.type === 'event') events.push(event);
            });
            return { statusCode: 200 };
          },
          flush: async () => true,
        } as any),
    });
    client.init();
    clients.push(client);
    const scope = new Sentry.Scope();
    scope.setClient(client);
    return { client, scope, events };
  };

  beforeEach(() => {
    monotonicNow = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => monotonicNow);
  });

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close(1000)));
    jest.restoreAllMocks();
  });

  test('reports the first error and one per monotonic hour despite changed timestamps and system time', async () => {
    const { client, scope, events } = createRecordingClient();
    const wallClock = jest.spyOn(Date, 'now').mockReturnValue(1791353462000);

    scope.captureException(new Error(clockErrorMessage()));
    await client.flush(1000);
    expect(events).toHaveLength(1);
    expect(events[0].exception.values[0].value).toBe(clockErrorMessage());

    monotonicNow = 1;
    wallClock.mockReturnValue(1791353462000 + 2 * HOUR_MS);
    scope.captureException(new Error(clockErrorMessage(1)));
    await client.flush(1000);
    expect(events).toHaveLength(1);

    monotonicNow = HOUR_MS - 1;
    wallClock.mockReturnValue(1791353462000 - 2 * HOUR_MS);
    scope.captureException(new Error(clockErrorMessage(2)));
    await client.flush(1000);
    expect(events).toHaveLength(1);

    monotonicNow = HOUR_MS;
    scope.captureException(new Error(clockErrorMessage(3)));
    await client.flush(1000);
    expect(events).toHaveLength(2);
    expect(events[1].exception.values[0].value).toBe(clockErrorMessage(3));
    expect(events[0].tags).toMatchObject({ walletconnect_error: 'clock_skew' });
  });

  test('keeps a separate first report for each configuration', async () => {
    const first = createRecordingClient();
    const second = createRecordingClient();

    first.scope.captureException(new Error(clockErrorMessage()));
    second.scope.captureException(new Error(clockErrorMessage(1)));
    await Promise.all([first.client.flush(1000), second.client.flush(1000)]);

    expect(first.events).toHaveLength(1);
    expect(second.events).toHaveLength(1);
  });

  test('limits event-only clock errors whose original exception is unavailable', async () => {
    const { client, scope, events } = createRecordingClient();
    for (let offset = 0; offset < 3; offset++) {
      scope.captureEvent({
        exception: {
          values: [{ type: 'Error', value: clockErrorMessage(offset) }],
        },
      });
    }
    await client.flush(1000);

    expect(events).toHaveLength(1);
    expect(events[0].exception.values[0].value).toBe(clockErrorMessage());
  });

  test.each([
    'WebSocket connection closed abnormally with code: 3000 (Country is blocked)',
    'WebSocket connection closed abnormally with code: 3000 (JWT validation error: JWT Token has expired)',
    'JWT validation error: JWT Token is not yet valid: basic.iat: 1791353462',
    'WebSocket connection closed abnormally with code: 3000 (Other Token is not yet valid: basic.iat: 1791353462)',
    clockErrorMessage().replace('code: 3000 ', 'code: 1006 '),
  ])('keeps repeated unrelated failures: %s', async (message) => {
    const { client, scope, events } = createRecordingClient();
    scope.captureException(new Error(message));
    scope.captureException(new Error(message));
    await client.flush(1000);

    expect(events).toHaveLength(2);
    expect(events.every((event) => !event.tags?.walletconnect_error)).toBe(
      true
    );
  });

  test('keeps unknown WalletConnect signing failures even while relay clock errors are limited', async () => {
    const { client, scope, events } = createRecordingClient();
    scope.captureException(new Error(clockErrorMessage()));

    for (let offset = 1; offset <= 2; offset++) {
      const error = new Error(clockErrorMessage(offset));
      attachSigningContext(error, {
        schema_version: 1,
        wallet_family: 'walletconnect',
        wallet_provider: 'walletconnect',
        transport: 'qr',
        operation: 'transaction',
        stage: 'sign',
        outcome: 'failed',
        error_category: 'unknown',
        duration_bucket: 'lt_100ms',
      });
      scope.captureException(error);
    }
    await client.flush(1000);

    expect(events).toHaveLength(3);
    const signingEvents = events.filter(
      (event) => event.tags?.wallet_family === 'walletconnect'
    );
    expect(signingEvents).toHaveLength(2);
    expect(
      signingEvents.every((event) => event.tags?.error_category === 'unknown')
    ).toBe(true);
  });
});
