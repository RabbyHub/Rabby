import cloneDeep from 'lodash/cloneDeep';
import { preferenceService, keyringService } from 'background/service';
import { Account } from 'background/service/preference';
import { isSameAddress } from 'background/utils';

class BaseController {
  @Reflect.metadata('PRIVATE', true)
  getCurrentAccount = async () => {
    let account = preferenceService.getCurrentAccount();
    if (account) {
      const accounts = await this.getAccounts();
      const matchAcct = accounts.find((acct) =>
        isSameAddress(account!.address, acct.address)
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

  @Reflect.metadata('PRIVATE', true)
  syncGetCurrentAccount = () => {
    return preferenceService.getCurrentAccount() || null;
  };

  @Reflect.metadata('PRIVATE', true)
  getAccounts = () => {
    return keyringService.getAllVisibleAccountsArray();
  };
}

export default BaseController;
