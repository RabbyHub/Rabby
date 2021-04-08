import * as methodMap from './methods';

export const NEED_CONFIRM = ['personal_sign'];

export default {
  'eth_chainId': methodMap.getChainId,
  'personal_sign': methodMap.personalSign,
  'eth_requestAccounts': methodMap.getAccounts,
  'eth_accounts': methodMap.getAccounts,
  'eth_sendTransaction': methodMap.sendTransaction,
};

export { default as Flow } from './flow';
export { default as http } from './http';

export {
  methodMap,
};
