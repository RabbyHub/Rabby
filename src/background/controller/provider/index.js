import * as methodMap from './methods';
import { permission } from 'background/service';
import Flow from './flow';

export const NEED_CONFIRM = ['personal_sign', 'eth_sendTransaction'];

const sendMetadata = ({ data: { method, params }, origin }) => {
  permission.setSiteMetadata(origin, params);
};

const getProviderState = (req) => {
  return {
    chainId: 1,
    // accounts: methodMap.getAccounts(req),
  };
};

export const EthMethods = {
  eth_chainId: methodMap.getChainId,
  personal_sign: methodMap.personalSign,
  eth_requestAccounts: methodMap.getAccounts,
  eth_accounts: methodMap.getAccounts,
  eth_sendTransaction: methodMap.sendTransaction,
  eth_getTransactionCount: () => '0x100',
};

const LocalMethods = {
  sendMetadata,
  getProviderState,
};

export default (req) => {
  const {
    data: { method },
  } = req;

  // console.log('handle', method, req)
  if (LocalMethods[method]) {
    return LocalMethods[method](req);
  }

  return new Flow().handle(req);
};
