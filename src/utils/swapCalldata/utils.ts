export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

export const isSameAddress = (first: string, second: string) => {
  if (typeof first !== 'string' || typeof second !== 'string') return false;
  return first.toLowerCase() === second.toLowerCase();
};

export const resolveToTokenReceiver = (
  encodedReceiver: string,
  txFrom: string
) => (isSameAddress(encodedReceiver, NULL_ADDRESS) ? txFrom : encodedReceiver);
