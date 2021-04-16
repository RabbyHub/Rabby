import { eth, permission } from 'background/service';

export default ({ origin }) => {
  if (!permission.hasPerssmion(origin)) {
    return [];
  }

  return eth.getAccounts();
};
