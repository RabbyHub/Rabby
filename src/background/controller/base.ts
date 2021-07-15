import cloneDeep from 'lodash/cloneDeep';
import { preferenceService, keyringService } from 'background/service';
import { Account } from 'background/service/preference';

class BaseController {
  getCurrentAccount = async () => {
    let account = preferenceService.getCurrentAccount();
    if (account) {
      const accounts = await this.getAccounts();
      const matchAcct = accounts.find(
        (acct) => account!.address === acct.address
      );
      if (!matchAcct) account = undefined;
    }

    if (!account) {
      [account] = await this.getAccounts();
      if (!account) return null;
      preferenceService.setCurrentAccount(account);
    }

    return cloneDeep(account) as Account;
  };

  syncGetCurrentAccount = () => {
    return preferenceService.getCurrentAccount() || null;
  };

  getAccounts = () => {
    return keyringService.getAllVisibleAccountsArray();
  };
}

export default BaseController;
