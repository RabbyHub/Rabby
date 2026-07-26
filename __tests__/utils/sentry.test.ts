import {
  sanitizeSentryBreadcrumbUrl,
  shouldIgnoreSentryError,
} from '@/utils/sentry';

describe('Sentry ignored errors', () => {
  test.each([
    'sw is dead:A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received',
    'sw is inactive',
    'No SW',
    'Error: Could not establish connection. Receiving end does not exist.',
    'IO error: .../000205.log: FILE_ERROR_NO_SPACE (ChromeMethodBFE: 3::WritableFileAppend::8)',
    'IO error: .../063441.ldb: FILE_ERROR_FAILED (ChromeMethodBFE: 6::WritableFileSync::1)',
    'Unable to create writable file ... (ChromeMethodBFE: 3::CreateWritableFile::8)',
    'DatabaseClosedError: UnknownError Internal error opening backing store for indexedDB.open.\n UnknownError: Internal error opening backing store for indexedDB.open.',
    'DatabaseClosedError: QuotaExceededError Encountered full disk while opening backing store for indexedDB.open.\n QuotaExceededError: Encountered full disk while opening backing store for indexedDB.open.',
    'Could not find an active browser window.',
    'UnknownError: Internal error.',
    'Non-Error promise rejection captured with keys: message',
    'Error: NotAllowedError: Permission denied.',
    "NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused.",
    'The browser is shutting down.',
    'No last-focused window',
    'No current window',
    'Failed to open popup',
    'DataCloneError: Function object could not be cloned.',
    'TypeError: Load failed',
    'The page keeping the extension port is moved into back/forward cache, so the message channel is closed.',
    'RPC Request failed. URL: https://sepolia.drpc.org Request body: {"method":"eth_getTransactionReceipt","params":["0xhash"]} Details: Unknown block Version: viem@2.47.6',
    'The request took too long to respond. URL: https://maculatus-rpc.x1eco.com/ Request body: {"method":"eth_getTransactionReceipt","params":["0xhash"]} Details: The request timed out. Version: viem@2.47.6',
    'Request exceeds defined limit. URL: https://1rpc.io/sepolia Request body: {"method":"eth_getTransactionReceipt","params":["0xhash"]} Details: Rate limit exceeded on Nodies public endpoints.',
  ])('ignores %s', (message) => {
    expect(shouldIgnoreSentryError(message)).toBe(true);
  });

  test('keeps the bounds issue reportable', () => {
    expect(
      shouldIgnoreSentryError(
        'Invalid value for bounds. Bounds must be at least 50% within visible screen space.'
      )
    ).toBe(false);
  });

  test('ignores a Request timeout Error', () => {
    expect(shouldIgnoreSentryError(new Error('Request timeout'))).toBe(true);
  });

  test('keeps contextual timeout errors reportable', () => {
    expect(
      shouldIgnoreSentryError(new Error('Request timeout while signing'))
    ).toBe(false);
  });

  test.each([
    'HTTP request failed',
    'HTTP request failed. URL: https://custom-rpc.example',
    'RPC failed: http://127.0.0.1:8545',
    new Error('Request timed out: https://custom-network.example'),
  ])('ignores errors containing http text', (error) => {
    expect(shouldIgnoreSentryError(error)).toBe(true);
  });

  test('does not ignore generic RPC errors without protocol URLs', () => {
    expect(
      shouldIgnoreSentryError(new Error('RPC request failed without URL'))
    ).toBe(false);
  });
});

describe('Stale background forwarded listenCallback errors', () => {
  // Real serialized rejection reported from an old background service worker
  // (background.js line 2, pre-guard build) via Message.onRequest.
  const forwardedStack =
    "TypeError: Cannot read properties of undefined (reading 'apply')\n" +
    '    at o.listenCallback (chrome-extension://acmacodkjbdgmoleebolmdjonilkdbch/background.js:2:10190337)\n' +
    '    at o.onRequest (chrome-extension://acmacodkjbdgmoleebolmdjonilkdbch/background.js:2:11346745)\n' +
    '    at chrome-extension://acmacodkjbdgmoleebolmdjonilkdbch/background.js:2:11347588';

  test('ignores the UI-forwarded copy of an old background error', () => {
    expect(
      shouldIgnoreSentryError({
        message: "Cannot read properties of undefined (reading 'apply')",
        stack: forwardedStack,
      })
    ).toBe(true);
  });

  test('ignores the forwarded copy regardless of background.js line number', () => {
    expect(
      shouldIgnoreSentryError({
        message: 'anything',
        stack:
          '    at s.listenCallback (chrome-extension://id/background.js:4:12040208)',
      })
    ).toBe(true);
  });

  test('keeps a genuine background-origin Error report', () => {
    // setMessageErrorReporter captures real Error instances; those must still
    // be reported even though the stack matches the forwarded signature.
    const realError = new TypeError(
      "Cannot read properties of undefined (reading 'apply')"
    );
    realError.stack = forwardedStack;
    expect(shouldIgnoreSentryError(realError)).toBe(false);
  });

  test('keeps a generic apply error without the listenCallback signature', () => {
    expect(
      shouldIgnoreSentryError({
        message: "Cannot read properties of undefined (reading 'apply')",
        stack:
          "TypeError: Cannot read properties of undefined (reading 'apply')\n" +
          '    at renderDashboard (chrome-extension://id/ui.js:2:12345)',
      })
    ).toBe(false);
  });

  test('keeps a listenCallback error that is not from background.js', () => {
    expect(
      shouldIgnoreSentryError({
        message: 'boom',
        stack:
          '    at o.listenCallback (chrome-extension://id/content-script.js:2:100)',
      })
    ).toBe(false);
  });
});

describe('Sentry breadcrumb privacy', () => {
  test('removes query parameters, fragments, and wallet identifiers', () => {
    expect(
      sanitizeSentryBreadcrumbUrl(
        'https://api.example/account/0x0123456789abcdef0123456789abcdef01234567?token=secret#details'
      )
    ).toBe('https://api.example/account/[redacted]');
  });
});
