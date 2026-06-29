import type { BrowserOptions } from '@sentry/browser';

import { getSentryEnv } from '@/utils/env';
import { shouldReportUserBehaviorData } from '@/utils/user-data-tracking';
import {
  RABBY_SENTRY_IGNORE_ERRORS,
  sanitizeSentryBreadcrumbUrl,
} from '@/utils/sentry';

const SENTRY_DSN =
  'https://f4a992c621c55f48350156a32da4778d@o4507018303438848.ingest.us.sentry.io/4507018389749760';

export const getSentryConfig = (): BrowserOptions => ({
  dsn: SENTRY_DSN,
  release: process.env.release,
  environment: getSentryEnv(),
  integrations: (defaultIntegrations) =>
    defaultIntegrations.filter(
      (integration) => integration.name !== 'BrowserSession'
    ),
  enhanceFetchErrorMessages: 'report-only',
  maxBreadcrumbs: 50,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: false,
      response: false,
    },
    httpBodies: [],
    queryParams: false,
    genAI: {
      inputs: false,
      outputs: false,
    },
    stackFrameVariables: false,
    frameContextLines: 5,
  },
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
  beforeSend: async (event) => {
    if (!(await shouldReportUserBehaviorData())) {
      return null;
    }

    return event;
  },
  ignoreErrors: RABBY_SENTRY_IGNORE_ERRORS,
});
