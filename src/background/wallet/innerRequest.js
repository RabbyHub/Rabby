import { permission } from 'background/wallet';
import { methodMap } from 'background/request';

const sendMetadata = ({ data: { method, params }, origin }) => {
  permission.setSiteMetadata(origin, params);
}

const getProviderState = (req) => {
  return {}
  // return {
  //   chainId: methodMap.getChainId(),
  //   accounts: methodMap.getAccounts(req),
  // }
}

export default {
  sendMetadata,
  getProviderState
}
