// Error text Rabby must never report. Shared by the unit test for
// shouldIgnoreSentryError and by the pipeline test that replays the same
// samples through a real Sentry client: the ignore list lives in beforeSend
// rather than the SDK's `ignoreErrors`, so matching the helper is not proof
// that the event is actually dropped.
export const SENTRY_IGNORED_SAMPLES = [
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
];
