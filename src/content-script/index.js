import { Message } from 'helper';

const { PortMessage, DomMessage } = Message;

function injectPage() {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('provider.js');
  s.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(s);
}

injectPage();

const pm = new PortMessage().connect();

function wrapRequest(data) {
  return {
    data,
    origin: location.origin,
  }
}

new DomMessage().listen(data => pm.request(wrapRequest(data)));

function sendMetadata(connect) {
  const origin = location.origin;
  const icon = document.querySelector('head > link[rel~="icon"]')?.href;
  const name = document.querySelector('head > meta[name="title"]')?.content || document.title || origin;

  connect.request(wrapRequest({
    method: 'sendMetadata',
    params: { icon, name, origin },
  }));
}


if (document.readyState === 'complete') {
  sendMetadata(pm);
} else {
  const domContentLoadedHandler = () => {
    sendMetadata(pm);
    window.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
  };
  window.addEventListener('DOMContentLoaded', domContentLoadedHandler);
}


