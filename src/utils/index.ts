import DomMessage from './message/domMessage';
import PortMessage from './message/portMessage';

const Message = {
  DomMessage,
  PortMessage,
};

const insertScript = (url: string): Promise<HTMLScriptElement> => {
  return new Promise((resolve) => {
    const ele = document.createElement('script');
    ele.src = chrome.runtime.getURL(url);
    ele.addEventListener('load', () => resolve(ele));
    (document.head || document.documentElement).appendChild(ele);
  });
};

export { Message, insertScript };
