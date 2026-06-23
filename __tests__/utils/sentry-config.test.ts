jest.mock('@/utils/env', () => ({
  getSentryEnv: () => 'test',
}));
jest.mock('@/utils/user-data-tracking', () => ({
  shouldReportUserBehaviorData: jest.fn().mockResolvedValue(true),
}));

import { getSentryConfig } from '@/utils/sentry-config';

describe('Sentry configuration', () => {
  const config = getSentryConfig();

  test('disables automatic collection of sensitive wallet data', () => {
    expect(config.dataCollection).toEqual({
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
});
