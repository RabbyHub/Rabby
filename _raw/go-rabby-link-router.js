(() => {
  const api = chrome;
  if (!api?.runtime || !api?.webRequest?.onBeforeRequest || !api?.tabs) {
    return;
  }

  const onBeforeRequest = (details) => {
    if (details.tabId < 0 || details.method !== 'GET') {
      return;
    }

    let url;
    try {
      url = new URL(details.url);
    } catch (_) {
      return;
    }
    if (url.origin !== 'https://go.rabby.io') {
      return;
    }
    let desktopPath;
    switch (url.searchParams.get('target')) {
      case 'perps':
        desktopPath = 'desktop.html#/desktop/perps';
        break;
      case 'swap':
        desktopPath = 'desktop.html#/desktop/profile?action=swap';
        break;
      case 'bridge':
        desktopPath = 'desktop.html#/desktop/profile?action=bridge';
        break;
      case 'home':
      default:
        desktopPath = 'desktop.html#/desktop/profile';
        break;
    }
    const desktopUrl = api.runtime.getURL(desktopPath);

    try {
      const updateResult = api.tabs.update(details.tabId, {
        url: desktopUrl,
      });
      if (updateResult && typeof updateResult.catch === 'function') {
        updateResult.catch(() => {});
      }
    } catch (_) {
      return;
    }
  };

  const filter = {
    urls: ['https://go.rabby.io/*'],
    types: ['main_frame'],
  };

  api.webRequest.onBeforeRequest.addListener(onBeforeRequest, filter);
})();
