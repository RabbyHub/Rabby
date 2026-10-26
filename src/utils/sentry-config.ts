import type { BrowserOptions } from '@sentry/browser';
import browser from 'webextension-polyfill';
import { v4 as uuidv4 } from 'uuid';

import { getSentryEnv } from '@/utils/env';
import { shouldReportUserBehaviorData } from '@/utils/user-data-tracking';
import { isWalletConnectClockSkewError } from '@/utils/walletconnect-error';
import {
  applySigningContext,
  collectSentryEventText,
  getSigningContext,
  redactSentryEventAddresses,
  sanitizeSentryBreadcrumbUrl,
  sanitizeSentryPageUrl,
  shouldIgnoreSentryError,
} from '@/utils/sentry';

const SENTRY_USER_ID_KEY = 'sentryUserId';

let sentryUserIdPromise: Promise<string | undefined> | undefined;

// A random per-install id, so Sentry can count affected users without the IP.
const loadSentryUserId = async () => {
  try {
    const stored = (await browser.storage.local.get(SENTRY_USER_ID_KEY))[
      SENTRY_USER_ID_KEY
    ];
    if (typeof stored === 'string' && stored) {
      return stored;
    }
    const id = uuidv4();
    await browser.storage.local.set({ [SENTRY_USER_ID_KEY]: id });
    return id;
  } catch (e) {
    sentryUserIdPromise = undefined;
    return undefined;
  }
};

const getSentryUserId = () => {
  if (!sentryUserIdPromise) {
    sentryUserIdPromise = loadSentryUserId();
  }
  return sentryUserIdPromise;
};

export const getSentryConfig = (): BrowserOptions => {
  // Use a monotonic clock: the error being reported is a bad system clock.
  let lastClockSkewReport = -Infinity;

  return {
    dsn: process.env.RABBY_SENTRY_DSN,
    release: process.env.release,
    environment: getSentryEnv(),
    skipBrowserExtensionCheck: true,
    integrations: (defaultIntegrations) =>
      defaultIntegrations.filter(
        (integration) => integration.name !== 'BrowserSession'
      ),
    enhanceFetchErrorMessages: 'report-only',
    maxBreadcrumbs: 50,
    // Keeps the SDK from asking Sentry to infer the user's IP.
    sendDefaultPii: false,
    beforeBreadcrumb: (breadcrumb) => {
      // Console output and clicked DOM text may contain wallet data.
      if (
        breadcrumb.category === 'console' ||
        breadcrumb.category?.startsWith('ui.')
      ) {
        return null;
      }

      (['url', 'from', 'to'] as const).forEach((key) => {
        if (typeof breadcrumb.data?.[key] === 'string') {
          breadcrumb.data[key] = sanitizeSentryBreadcrumbUrl(
            breadcrumb.data[key]
          );
        }
      });

      return breadcrumb;
    },
    beforeSend: async (event, hint) => {
      if (!(await shouldReportUserBehaviorData())) {
        return null;
      }
      const originalException = hint?.originalException;

      // Owns the whole ignore list, including what the SDK's own `ignoreErrors`
      // used to drop, so it needs the Sentry-generated event text as well.
      if (
        shouldIgnoreSentryError(
          originalException,
          collectSentryEventText(event)
        )
      ) {
        return null;
      }

      // Errors thrown in background listen callbacks are already captured by
      // the background's message-error reporter and come back over the port
      // with this flag; drop them here so the same error doesn't surface a
      // second, unparseable copy from the receiving page.
      if (
        originalException !== null &&
        typeof originalException === 'object' &&
        (originalException as Record<string, any>).reportedFromBackground ===
          true
      ) {
        return null;
      }

      if (
        !getSigningContext(originalException) &&
        (isWalletConnectClockSkewError(originalException) ||
          collectSentryEventText(event).some(isWalletConnectClockSkewError))
      ) {
        const now = performance.now();
        if (now - lastClockSkewReport < 60 * 60 * 1000) {
          return null;
        }
        lastClockSkewReport = now;
        event.tags = { ...event.tags, walletconnect_error: 'clock_skew' };
      }

      // 判断是否是 plain object rejection（不是真正的 Error 实例）
      if (
        originalException !== null &&
        typeof originalException === 'object' &&
        !(originalException instanceof Error)
      ) {
        const obj = originalException as Record<string, any>;

        // 重新设置 issue 标题（用 message 字段）
        if (obj.message) {
          event.exception?.values?.forEach((ex) => {
            ex.type = obj.code ? `Error[${obj.code}]` : 'PromiseRejectionError';
            ex.value = obj.message;

            // 如果原始对象有 stack 字符串，尝试解析成 stacktrace
            // （Sentry 通常已经处理了，这里可以跳过）
          });
        }

        // 把原始对象的所有字段附加到 extra 里，方便查看
        if (!getSigningContext(originalException)) {
          event.extra = {
            ...event.extra,
            __serialized__: obj,
          };
        }
      }

      applySigningContext(event, originalException);

      // Replaces the whole user so no IP address rides along with the id.
      const userId = await getSentryUserId();
      event.user = userId ? { id: userId } : undefined;

      if (event.request) {
        const { url, headers } = event.request;
        event.request = {
          ...event.request,
          url: url && sanitizeSentryPageUrl(url),
          headers: headers?.Referer
            ? { ...headers, Referer: sanitizeSentryPageUrl(headers.Referer) }
            : headers,
        };
      }

      return redactSentryEventAddresses(event);
    },
    // No `ignoreErrors` on purpose: the SDK applies it before beforeSend runs,
    // which would drop hardware signing failures with a generic transport
    // message. shouldIgnoreSentryError above owns the whole ignore list.
  };
};
