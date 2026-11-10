import browser from 'webextension-polyfill';

export const isPrivilegedOffscreenSender = (
  sender: { id?: string; tab?: unknown; url?: string } | undefined
): boolean => {
  const extensionId = browser.runtime.id;
  return (
    typeof extensionId === 'string' &&
    extensionId.length > 0 &&
    sender?.id === extensionId &&
    !sender.tab
  );
};
