var _paq = (window._paq = window._paq || []);
/* tracker methods like "setCustomDimension" should be called before "trackPageView" */
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);
(function () {
  const handleExtensionId = function (result) {
    var u = 'https://matomo.debank.com/';
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

  setTimeout(() => {
    // is MV3
    if (chrome.runtime.getManifest().manifest_version === 3) {
      chrome.storage.local.get('extensionId').then(handleExtensionId);
    } else {
      chrome.storage.local.get('extensionId', handleExtensionId);
    }
  }, 500);
})();
