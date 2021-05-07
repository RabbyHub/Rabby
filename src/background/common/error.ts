class ChromeRuntimeError extends Error {}

function isRuntimeError(): void {
  const { lastError } = chrome.runtime;
  if (!lastError) {
    return;
  }

  throw new ChromeRuntimeError(lastError.message);
}

export { ChromeRuntimeError, isRuntimeError };
