import { preference, keyringService } from 'background/service';

class BaseController {
  getCurrentAccount = async () => {
    let account = preference.getCurrentAccount();
    if (account) {
      const accounts = await this.getAccounts();
      const matchAcct = accounts.find(
        (acct) => account!.address === acct.address
      );
      if (!matchAcct) account = undefined;
    }

    if (!account) {
      [account] = await this.getAccounts();
      preference.setCurrentAccount(account);
    }

    return account;
  };

  getAccounts = () => {
    return keyringService.getAllVisibleAccountsArray();
  };
}

export default BaseController;
