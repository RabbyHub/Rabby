import KeyringService from './index';

class DisplayKeyring {
  accounts: string[] = [];
  type = '';

  constructor(keyring) {
    this.accounts = keyring.accounts;
    this.type = keyring.type;
  }

  async unlock(): Promise<void> {
    const keyring = await KeyringService.getKeyringForAccount(
      this.accounts[0],
      this.type
    );
    return keyring.unlock();
  }

  async getFirstPage() {
    const keyring = await KeyringService.getKeyringForAccount(
      this.accounts[0],
      this.type
    );
    return await keyring.getFirstPage();
  }

  async getNextPage() {
    const keyring = await KeyringService.getKeyringForAccount(
      this.accounts[0],
      this.type
    );
    return await keyring.getNextPage();
  }

  async getAccounts() {
    const keyring = await KeyringService.getKeyringForAccount(
      this.accounts[0],
      this.type
    );
    return await keyring.getAccounts();
  }

  async activeAccounts(indexes: number[]): Promise<string[]> {
    const keyring = await KeyringService.getKeyringForAccount(
      this.accounts[0],
      this.type
    );
    return keyring.activeAccounts(indexes);
  }
}

export default DisplayKeyring;
