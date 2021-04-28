class ChromeRuntimeError extends Error {}

function isRuntimeError() {
  const { lastError } = chrome.runtime;
  if (!lastError) {
    return;
  }

  throw new ChromeRuntimeError(lastError.message);
}

export {
  ChromeRuntimeError,
  isRuntimeError,
}
