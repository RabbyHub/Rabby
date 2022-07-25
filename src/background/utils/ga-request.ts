import { storage } from 'background/webapi';
import { nanoid } from 'nanoid';

const ANALYTICS_PATH = 'https://www.google-analytics.com/collect';

async function postData(url = '', data: RequestInit['body']) {
  const response = await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: data,
  });

  return response;
}

const getGAParams = async () => {
  let cid = await storage.get('cid');
  if (!cid) {
    cid = nanoid();
    storage.set('cid', cid);
  }

  const gaParams = new URLSearchParams();
  gaParams.append('v', '1');
  gaParams.append('tid', 'UA-199755108-3');
  gaParams.append('cid', cid);
  gaParams.append('t', 'event');
  gaParams.append('an', 'Rabby');
  gaParams.append('av', process.env.release ?? '');

  return gaParams;
};

export const gaRequestEvent = async (
  data: {
    category?: string;
    action?: string;
    label?: string;
    value?: string | number;
  } = {}
) => {
  const params = await getGAParams();

  for (const key in data) {
    const value = data[key];
    if (value) {
      params.append('e' + key[0], value);
    }
  }

  return postData(ANALYTICS_PATH, params);
};
