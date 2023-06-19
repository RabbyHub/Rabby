import { SecurityCheckResponse } from '@rabby-wallet/rabby-api/dist/types';
import { ParsedMessage } from '@spruceid/siwe-parser';
import { isSameAddress } from '.';

export const detectSIWE = (message: string) => {
  try {
    const parsedMessage = new ParsedMessage(message);

    return {
      isSIWEMessage: true,
      parsedMessage,
    };
  } catch (error) {
    // ignore error, it's not a valid SIWE message
    return {
      isSIWEMessage: false,
      parsedMessage: null,
    };
  }
};

export const checkSIWEDomain = (
  origin: string,
  parsedMessage: ParsedMessage
) => {
  let isSIWEDomainValid = false;

  if (origin) {
    const { host } = new URL(origin);
    isSIWEDomainValid = parsedMessage.domain === host;
  }
  return isSIWEDomainValid;
};

export const checkSIWEAddress = (
  address: string,
  parsedMessage: ParsedMessage
) => {
  let isSIWEAddressValid = false;

  if (address) {
    isSIWEAddressValid = isSameAddress(address, parsedMessage.address);
  }
  return isSIWEAddressValid;
};

export const genSecurityCheckMessage = ({
  alert,
  status = 'warning',
}: {
  alert: string;
  status: 'warning' | 'forbidden';
}): SecurityCheckResponse => {
  const base = {
    warning_count: 0,
    warning_list: [],
    decision: 'pass',
    alert,
    danger_list: [],
    forbidden_list: [],
    forbidden_count: 0,
    danger_count: 1,
    alert_count: 0,
    trace_id: '1',
  } as SecurityCheckResponse;
  if (status === 'forbidden') {
    return {
      ...base,
      decision: 'forbidden',
      forbidden_count: 1,
      forbidden_list: [
        {
          alert,
          decision: 'forbidden',
          description: '',
          is_alert: true,
          id: 1,
        },
      ],
    };
  }
  return {
    ...base,
    decision: 'warning',
    warning_count: 1,
    warning_list: [
      {
        alert,
        decision: 'warning',
        description: '',
        is_alert: true,
        id: 1,
      },
    ],
  };
};
