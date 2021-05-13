import { keyringService, preference } from 'background/service';

class BaseController {
  getAccount = async () => {
    let account = preference.getCurrentAccount();

    if (!account) {
      [account] = await this.getAccounts();
      preference.setCurrentAccount(account);
    }

    return account;
  };

  getAccounts = () => keyringService.getAccounts();
}

export default BaseController;
