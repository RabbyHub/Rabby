import * as Sentry from '@sentry/browser';

import { redactSensitiveText } from '@/utils/sentry';

// Long enough for a Hyperliquid rejection reason, short enough that a stray
// payload can't push the issue title past what Sentry groups on.
const MAX_DETAIL_LENGTH = 300;

// JSON.stringify(error) is "{}" for a native Error — message and stack are
// non-enumerable — which is why the Perps issues in Sentry all read
// `error: {}`. The SDK rethrows every failure as `new Error(message)`
// (hyperliquid-sdk http-client), so the text has to be read off the
// properties instead of serialized.
export const describePerpsError = (error: unknown): string => {
  if (error === null || error === undefined) {
    return '';
  }

  if (typeof error !== 'object') {
    return redactSensitiveText(error).slice(0, MAX_DETAIL_LENGTH);
  }

  const candidate = error as Record<string, any>;
  const text =
    candidate.message ??
    candidate.shortMessage ??
    candidate.error?.message ??
    candidate.details ??
    candidate.code;

  if (text !== null && text !== undefined && text !== '') {
    return redactSensitiveText(text).slice(0, MAX_DETAIL_LENGTH);
  }

  // Plain-object rejections (background-forwarded errors, API payloads) do
  // serialize, so they are still worth a look before falling back.
  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== '{}') {
      return redactSensitiveText(serialized).slice(0, MAX_DETAIL_LENGTH);
    }
  } catch {
    // Circular payload — String() below is all we can report.
  }

  return redactSensitiveText(error).slice(0, MAX_DETAIL_LENGTH);
};

/**
 * Report a Perps failure to Sentry with the original error text intact.
 *
 * `scene` is a fixed description of what failed ('open market order'), never
 * interpolated with request data: it becomes the issue title and fingerprint,
 * so putting params in it splits one bug across every coin the users traded.
 * Everything variable belongs in `extra`.
 *
 * Because the original text now reaches the message, these reports finally go
 * through RABBY_SENTRY_IGNORE_ERRORS like every other report — network noise
 * (timeouts, HTTP failures) is dropped in beforeSend instead of arriving as an
 * unreadable `error: {}`.
 */
export const capturePerpsError = (
  scene: string,
  error?: unknown,
  extra?: Record<string, unknown>
) => {
  const detail = describePerpsError(error);

  Sentry.captureException(
    new Error(detail ? `PERPS ${scene}: ${detail}` : `PERPS ${scene}`),
    {
      tags: { perps_scene: scene },
      fingerprint: ['perps', scene, '{{ default }}'],
      extra: {
        ...extra,
        // The synthetic Error above only ever points at this file, so the
        // throw site has to be carried separately.
        perps_error_stack:
          error instanceof Error ? error.stack : (error as any)?.stack,
        perps_error_name: (error as any)?.name,
        perps_error_code: (error as any)?.code,
      },
    }
  );
};
