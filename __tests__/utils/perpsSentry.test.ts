import * as Sentry from '@sentry/browser';

import { capturePerpsError, describePerpsError } from '@/ui/views/Perps/sentry';
import { shouldIgnoreSentryError } from '@/utils/sentry';

jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));

const captureException = Sentry.captureException as jest.Mock;

// The event as Sentry receives it, plus whether beforeSend would drop it.
const capture = (
  scene: string,
  error?: unknown,
  extra?: Record<string, any>
) => {
  captureException.mockClear();
  capturePerpsError(scene, error, extra);

  const [reported, context] = captureException.mock.calls[0];

  return {
    message: (reported as Error).message,
    tags: context.tags,
    fingerprint: context.fingerprint,
    extra: context.extra,
    dropped: shouldIgnoreSentryError(reported),
  };
};

const ADDRESS = '0x9bba7ebc9c69db92950def377d732b91bb22d02f';

describe('perps error reporting', () => {
  // The whole point of the change: hyperliquid-sdk rethrows every failure as a
  // native Error, whose message/stack are non-enumerable, so JSON.stringify
  // produced the `error: {}` seen on RABBY-40J and friends.
  it('reads text off a native Error that JSON.stringify renders empty', () => {
    const error = new Error('Insufficient margin to place order');

    expect(JSON.stringify(error)).toBe('{}');
    expect(describePerpsError(error)).toBe(
      'Insufficient margin to place order'
    );
  });

  it('reports a Hyperliquid rejection with the reason in the title', () => {
    const event = capture(
      'Cannot Change Leverage',
      new Error('Insufficient margin'),
      { params: { coin: 'BTC', leverage: 2 } }
    );

    expect(event.message).toBe(
      'PERPS Cannot Change Leverage: Insufficient margin'
    );
    expect(event.dropped).toBe(false);
  });

  // Request data stays out of the title so one bug does not split into one
  // issue per coin the users happened to trade.
  it('groups by scene, not by request data', () => {
    const btc = capture('open position error', new Error('rejected'), {
      params: { coin: 'BTC' },
    });
    const eth = capture('open position error', new Error('rejected'), {
      params: { coin: 'ETH' },
    });

    expect(btc.message).toBe(eth.message);
    expect(btc.fingerprint).toEqual([
      'perps',
      'open position error',
      '{{ default }}',
    ]);
    expect(btc.tags).toEqual({ perps_scene: 'open position error' });
    expect(btc.extra.params).toEqual({ coin: 'BTC' });
  });

  it('drops network noise now that the text is no longer swallowed', () => {
    expect(
      capture('open position error', new Error('HTTP 429: Too Many Requests'))
        .dropped
    ).toBe(true);
    expect(
      capture('withdraw failed', new Error('Failed to fetch')).dropped
    ).toBe(true);
  });

  it('still reads plain-object rejections forwarded from the background', () => {
    const event = capture('cancel error', {
      message: 'User rejected the request.',
      stack: 'Error: ...',
    });

    expect(event.message).toBe(
      'PERPS cancel error: User rejected the request.'
    );
    expect(event.dropped).toBe(false);
  });

  it('reports a scene with no error object at all (noFills, partial fail)', () => {
    const event = capture('close position noFills', null, {
      res: { ok: false },
    });

    expect(event.message).toBe('PERPS close position noFills');
    expect(event.extra.res).toEqual({ ok: false });
  });

  // Diagnostics are reported as-is. A Perps failure is only actionable if it
  // can be traced back to the account that hit it, and events already carry
  // the user's IP (sendDefaultPii). redactSensitiveText is not applied here —
  // it exists for hardware-signing errors, a different kind of secret.
  describe('diagnostics reach Sentry intact', () => {
    it('keeps the account the failure belongs to', () => {
      const { extra } = capture('withdraw failed', new Error('rejected'), {
        address: ADDRESS,
        accountType: 'Ledger Hardware',
        amount: 152,
      });

      expect(extra.address).toBe(ADDRESS);
      expect(extra.accountType).toBe('Ledger Hardware');
      expect(extra.amount).toBe(152);
    });

    it('keeps the throw site the synthetic Error cannot carry', () => {
      const error = new Error('rejected');
      const { extra } = capture('login failed', error);

      expect(extra.perps_error_stack).toBe(error.stack);
      expect(extra.perps_error_name).toBe('Error');
    });

    // The noFills/failed paths report with error=null, so the Hyperliquid
    // rejection reason only reaches Sentry through `res`.
    it('keeps a Hyperliquid rejection carried by res', () => {
      const { extra } = capture('update margin failed', null, {
        coin: 'CASHCAT',
        margin: 79.78,
        res: {
          response: {
            data: {
              statuses: [
                { error: `User or API Wallet ${ADDRESS} does not exist.` },
              ],
            },
          },
        },
      });

      expect((extra.res as any).response.data.statuses[0].error).toBe(
        `User or API Wallet ${ADDRESS} does not exist.`
      );
      expect(extra.coin).toBe('CASHCAT');
      expect(extra.margin).toBe(79.78);
    });
  });
});
