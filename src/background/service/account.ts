import eth from './eth';
import preference from './preference';

class Account {
  getAccount = async () => {
    let account = preference.getCurrentAccount();

    if (!account) {
      [account] = await this.getAccounts();
      preference.setCurrentAccount(account);
    }

    return account;
  };

  getAccounts = () => eth.keyringService.getAccounts();
}

export default new Account();
