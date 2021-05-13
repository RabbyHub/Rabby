import { keyringService, preference } from 'background/service';

class BaseController {
  getAccount = async () => {
    let account: string | undefined = preference.getCurrentAccount();
    if (account) {
      const accounts: string[] = await this.getAccounts();
      const matchAcct = accounts.find((acct) => account === acct);
      if (!matchAcct) account = undefined;
    }

    if (!account) {
      [account] = await this.getAccounts();
      preference.setCurrentAccount(account);
    }

    return account;
  };

  getAccounts = () => {
    return keyringService!.getAccounts();
  };
}

export default BaseController;
