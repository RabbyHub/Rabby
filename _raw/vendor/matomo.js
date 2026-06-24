var _paq = (window._paq = window._paq || []);
(function () {
  var matomoClientLoaded = false;

  const handleStorage = function (result) {
    if (
      matomoClientLoaded ||
      !result.preference ||
      result.preference.userDataTrackingOptOut === true
    ) {
      return;
    }

    matomoClientLoaded = true;
    var u = 'https://matomo.debank.com/';
    /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
    _paq.push(['trackPageView']);
    _paq.push(['setTrackerUrl', u + 'matomo.php']);
    _paq.push(['setSiteId', '2']);
    if (result.extensionId) {
      _paq.push(['setVisitorId', result.extensionId]);
    }
    var d = document,
      g = d.createElement('script'),
      s = d.getElementsByTagName('script')[0];
    g.async = true;
    g.src = '/vendor/matomo.client.js';
    s.parentNode.insertBefore(g, s);
  };

  const syncStorage = function () {
    // is MV3
    if (chrome.runtime.getManifest().manifest_version === 3) {
      chrome.storage.local
        .get(['preference', 'extensionId'])
        .then(handleStorage);
    } else {
      chrome.storage.local.get(['preference', 'extensionId'], handleStorage);
    }
  };

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== 'local' || !changes.preference) {
      return;
    }

    syncStorage();
  });

  setTimeout(() => {
    syncStorage();
  }, 500);
})();
