import { permission } from 'background/wallet';
import { methodMap } from 'background/request';

const sendMetadata = ({ data: { method, params }, origin }) => {
  permission.setSiteMetadata(origin, params);
}

const getProviderState = (req) => {
  return {
    chainId: 1,
    // accounts: methodMap.getAccounts(req),
  }
}

export default {
  sendMetadata,
  getProviderState
}
