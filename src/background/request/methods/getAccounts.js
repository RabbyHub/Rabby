import eth from 'background/eth';
import { permission } from 'background/wallet';

export default ({ origin }) => {
  if (!permission.hasPerssmion(origin)) {
    return [];
  }

  return eth.getAccounts();
};
