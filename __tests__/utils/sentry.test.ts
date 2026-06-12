import { shouldIgnoreSentryError } from '@/utils/sentry';

describe('Sentry ignored errors', () => {
  test.each([
    'sw is dead:A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received',
    'sw is inactive',
    'No SW',
    'Error: Could not establish connection. Receiving end does not exist.',
    'IO error: .../000205.log: FILE_ERROR_NO_SPACE (ChromeMethodBFE: 3::WritableFileAppend::8)',
    'Unable to create writable file ... (ChromeMethodBFE: 3::CreateWritableFile::8)',
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
