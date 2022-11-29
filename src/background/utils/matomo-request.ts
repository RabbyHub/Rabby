import { customAlphabet, nanoid } from 'nanoid';
import { preferenceService } from '../service';

const ANALYTICS_PATH = 'https://matomo.debank.com/matomo.php';
const genRequestId = customAlphabet('1234567890abcdef', 16);

async function postData(url = '', params: URLSearchParams) {
  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'POST',
  });

  return response;
}
const getParams = async () => {
  let requestId = await preferenceService.getRequestId();
  if (!requestId) {
    requestId = genRequestId();
    preferenceService.updateRequestId(requestId);
  }

  const gaParams = new URLSearchParams();
  gaParams.append('action_name', location.hash.substring(2) ?? 'background');
  gaParams.append('idsite', '2');
  gaParams.append('rec', '1');
  gaParams.append('url', encodeURI(location.href));
  gaParams.append('_id', requestId);
  gaParams.append('rand', nanoid());
  gaParams.append('ca', '1');
  gaParams.append('h', new Date().getUTCHours().toString());
  gaParams.append('m', new Date().getUTCMinutes().toString());
  gaParams.append('s', new Date().getUTCSeconds().toString());
  gaParams.append('cookie', '0');
  gaParams.append('send_image', '0');

  return gaParams;
};

export const matomoRequestEvent = async (
  data: {
    category?: string;
    action?: string;
    label?: string;
    value?: string | number;
    transport?: string;
  } = {}
) => {
  const params = await getParams();

  if (data.category) {
    params.append('e_c', data.category);
  }

  if (data.action) {
    params.append('e_a', data.action);
  }

  if (data.label) {
    params.append('e_n', data.label);
  }

  if (data.value) {
    params.append('e_v', data.value as string);
  }

  if (data.transport) {
    params.append('e_i', data.transport);
  }

  return postData(ANALYTICS_PATH, params);
};
