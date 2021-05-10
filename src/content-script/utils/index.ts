import { browser } from 'webextension-polyfill-ts';

const insertScript = (url: string): Promise<HTMLScriptElement> => {
  return new Promise((resolve, reject) => {
    const ele = document.createElement('script');
    ele.src = browser.runtime.getURL(url);
    ele.addEventListener('load', () => resolve(ele));
    ele.addEventListener('error', (err) => reject(err));
    (document.head || document.documentElement).appendChild(ele);
  });
};

export { insertScript };
