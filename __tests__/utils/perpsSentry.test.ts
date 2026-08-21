import { describePerpsError } from '@/ui/views/Perps/sentry';
import { shouldIgnoreSentryError } from '@/utils/sentry';

// What Sentry actually receives for a Perps failure: capturePerpsError builds
// `PERPS <scene>: <detail>` and beforeSend runs that synthetic Error through
// the ignore list.
const reportFor = (scene: string, error: unknown) => {
  const detail = describePerpsError(error);
  const event = new Error(
    detail ? `PERPS ${scene}: ${detail}` : `PERPS ${scene}`
  );

  return { message: event.message, dropped: shouldIgnoreSentryError(event) };
};

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
    expect(
      reportFor('Cannot Change Leverage', new Error('Insufficient margin'))
    ).toEqual({
      message: 'PERPS Cannot Change Leverage: Insufficient margin',
      dropped: false,
    });
  });

  it('drops network noise now that the text is no longer swallowed', () => {
    expect(
      reportFor('open position error', new Error('HTTP 429: Too Many Requests'))
        .dropped
    ).toBe(true);
    expect(
      reportFor('withdraw failed', new Error('Failed to fetch')).dropped
    ).toBe(true);
  });

  it('still reads plain-object rejections forwarded from the background', () => {
    const forwarded = {
      message: 'User rejected the request.',
      stack: 'Error: ...',
    };

    expect(reportFor('cancel error', forwarded)).toEqual({
      message: 'PERPS cancel error: User rejected the request.',
      dropped: false,
    });
  });

  it('reports a scene with no error object at all (noFills, partial fail)', () => {
    expect(reportFor('close position noFills', null)).toEqual({
      message: 'PERPS close position noFills',
      dropped: false,
    });
  });

  it('redacts addresses that leak into an error message', () => {
    const detail = describePerpsError(
      new Error(
        'agent 0x9bba7ebc9c69db92950def377d732b91bb22d02f is not registered'
      )
    );

    expect(detail).toBe('agent [redacted-hex] is not registered');
  });
});
