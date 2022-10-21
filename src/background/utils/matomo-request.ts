import { storage } from 'background/webapi';
import { nanoid } from 'nanoid';

const ANALYTICS_PATH = 'https://matomo.debank.com/matomo.php';

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
const getParams = async () => {
  let cid = await storage.get('cid');
  if (!cid) {
    cid = nanoid();
    storage.set('cid', cid);
  }

  const gaParams = new URLSearchParams();
  gaParams.append('idsite', '2');
  gaParams.append('rec', '1');
  gaParams.append('apiv', '1');
  gaParams.append('url', location.href);
  gaParams.append('_id', cid);
  gaParams.append('rand', nanoid());

  return gaParams;
};

export const matomoRequestEvent = async (
  data: {
    category?: string;
    action?: string;
    label?: string;
    value?: string | number;
  } = {}
) => {
  const params = await getParams();

  params.append('action_name', [data.category, data.action].join('/'));
  const cvar = {};
  if (data.label) {
    cvar['1'] = ['label', data.label];
  }
  if (data.value) {
    cvar['2'] = ['value', data.value];
  }
  params.append('cvar', JSON.stringify(cvar));

  return postData(ANALYTICS_PATH, params);
};
