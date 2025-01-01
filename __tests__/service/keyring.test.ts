import { KeyringService } from 'background/service/keyring';
import sinon from 'sinon';
import mockEncryptor from './mock-encryptor';
import contactBook from '@/background/service/contactBook';
import { normalizeAddress } from '@/background/utils';
import { Wallet } from '@ethereumjs/wallet';
import { bytesToHex } from '@ethereumjs/util';

const password = 'password123';
const walletOneSeedWords =
  'puzzle seed penalty soldier say clay field arctic metal hen cage runway';

describe('KeyringService setup', () => {
  let keyringService;

  beforeAll(() => {
    keyringService = new KeyringService();
    keyringService.encryptor = mockEncryptor;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('boot', () => {
    it('should load store', async () => {
      keyringService.loadStore({});
      expect(keyringService.store).not.toBeUndefined();
    });

    it('should booted', async () => {
      keyringService.boot('password');
      expect(keyringService.store.getState().booted).toBeUndefined();
    });
  });

  describe('setLocked', () => {
    it('setLocked correctly sets lock state', async () => {
      await keyringService.setLocked();
      expect(keyringService.password).toBeNull();
      expect(keyringService.memStore.getState().isUnlocked).toBe(false);
      expect(keyringService.keyrings).toHaveLength(0);
    });

    it('emits "lock" event', async () => {
      const spy = sinon.spy();
      keyringService.on('lock', spy);
      await keyringService.setLocked();
      expect(spy.calledOnce).toBe(true);
    });
  });
});

describe('keyringService', () => {
  let keyringService;

  beforeEach(async () => {
    keyringService = new KeyringService();
    keyringService.encryptor = mockEncryptor;
    keyringService.loadStore({});
    await keyringService.boot(password);
    await keyringService.clearKeyrings();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('submitPassword', () => {
    it('emits "unlock" event', async () => {
      await keyringService.setLocked();
      const spy = sinon.spy();
      keyringService.on('unlock', spy);

      await keyringService.submitPassword(password);
      expect(spy.calledOnce).toBe(true);
    });
  });

  describe('addNewKeyring', () => {
    it('should add simple key pair', async () => {
      const privateKey =
        'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3';
      const previousAccounts = await keyringService.getAccounts();
      const keyring = await keyringService.addNewKeyring('Simple Key Pair', [
        privateKey,
      ]);
      const keyringAccounts = await keyring.getAccounts();
      const expectedKeyringAccounts = [
        '0x627306090abab3a6e1400e9345bc60c78a8bef57',
      ];
      expect(keyringAccounts).toStrictEqual(expectedKeyringAccounts);
      const allAccounts = await keyringService.getAccounts();
      const expectedAllAccounts = previousAccounts.concat(
        expectedKeyringAccounts
      );
      expect(allAccounts).toStrictEqual(expectedAllAccounts);
    });

    it('should add HD Key Tree', async () => {
      expect(keyringService.keyrings).toHaveLength(0);
      await keyringService.addNewKeyring('HD Key Tree');
      expect(keyringService.keyrings).toHaveLength(1);
    });
  });

  describe('restoreKeyring', () => {
    it("should pass a keyring's serialized data back to the correct type.", async () => {
      const mockSerialized = {
        type: 'HD Key Tree',
        data: {
          mnemonic: walletOneSeedWords,
          numberOfAccounts: 1,
        },
      };

      const keyring = await keyringService.restoreKeyring(mockSerialized);
      expect(keyring.hdWallet).toBeTruthy();
    });
  });

  describe('getAccounts', () => {
    it('returns the result of getAccounts for each keyring', async () => {
      keyringService.keyrings = [
        {
          getAccounts() {
            return Promise.resolve([1, 2, 3]);
          },
        },
        {
          getAccounts() {
            return Promise.resolve([4, 5, 6]);
          },
        },
      ];

      const result = await keyringService.getAccounts();
      expect(result).toStrictEqual([
        '0x01',
        '0x02',
        '0x03',
        '0x04',
        '0x05',
        '0x06',
      ]);
    });
  });

  describe('removeAccount', () => {
    it('removes an account from the corresponding keyring', async () => {
      const account = {
        privateKey:
          'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
        publicKey: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
      };

      const accountsBeforeAdding = await keyringService.getAccounts();

      // Add a new keyring with one account
      await keyringService.addNewKeyring('Simple Key Pair', [
        account.privateKey,
      ]);

      // remove that account that we just added
      await keyringService.removeAccount(account.publicKey, 'Simple Key Pair');

      // fetch accounts after removal
      const result = await keyringService.getAccounts();
      expect(result).toStrictEqual(accountsBeforeAdding);
    });

    it('removes the keyring if there are no accounts after removal', async () => {
      const account = {
        privateKey:
          'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
        publicKey: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
      };

      // Add a new keyring with one account
      await keyringService.addNewKeyring('Simple Key Pair', [
        account.privateKey,
      ]);

      // We should have 1 keyrings
      expect(keyringService.keyrings).toHaveLength(1);

      // remove that account that we just added
      await keyringService.removeAccount(account.publicKey, 'Simple Key Pair');

      // Check that the previous keyring with only zero account
      // was also removed after removing the account
      expect(keyringService.keyrings).toHaveLength(0);
    });
  });

  describe('unlockKeyrings', () => {
    it('returns the list of keyrings', async () => {
      const keyring = await keyringService.addNewKeyring('Simple Key Pair');
      await keyring.addAccounts();
      await keyringService.setLocked();
      const keyrings = await keyringService.unlockKeyrings(password);
      expect(keyrings).toHaveLength(1);
      keyrings.forEach((keyring) => {
        expect(keyring.wallets).toBeDefined();
      });
    });
  });

  describe('verifyPassword', () => {
    beforeEach(() => {
      keyringService.store.updateState({
        booted: false,
      });
    });
    afterEach(() => {
      keyringService.store.updateState({
        booted: true,
      });
    });
    it('throws an error if no encrypted vault is in controller state', async () => {
      await expect(() =>
        keyringService.verifyPassword('password')
      ).rejects.toThrow('background.error.canNotUnlock');
    });
  });

  describe('addNewAccount', () => {
    it('adds a new account to the keyring it receives as an argument', async () => {
      await contactBook.init();
      const keyring = await keyringService.addNewKeyring('HD Key Tree');
      await keyring.addAccounts();

      const [HDKeyring] = await keyringService.getKeyringsByType('HD Key Tree');
      const initialAccounts = await HDKeyring.getAccounts();
      expect(initialAccounts).toHaveLength(1);

      await keyringService.addNewAccount(HDKeyring);
      const accountsAfterAdd = await HDKeyring.getAccounts();
      expect(accountsAfterAdd).toHaveLength(2);
    });
  });

  describe('getAppKeyAddress', () => {
    it('returns the expected app key address', async () => {
      const address = '0x01560cd3bac62cc6d7e6380600d9317363400896';
      const privateKey =
        '0xb8a9c05beeedb25df85f8d641538cbffedf67216048de9c678ee26260eb91952';

      const keyring = await keyringService.addNewKeyring('Simple Key Pair', [
        privateKey,
      ]);
      keyring.getAppKeyAddress = sinon.spy();
      const getKeyringForAccount = (keyringService.getKeyringForAccount = sinon
        .stub()
        .returns(Promise.resolve(keyring)));

      await keyringService.getAppKeyAddress(address, 'someapp.origin.io');

      expect(getKeyringForAccount.calledOnce).toBe(true);
      expect(getKeyringForAccount.getCall(0).args[0]).toBe(
        normalizeAddress(address)
      );
      expect(keyring.getAppKeyAddress.calledOnce).toBe(true);
      expect(keyring.getAppKeyAddress.getCall(0).args).toStrictEqual([
        normalizeAddress(address),
        'someapp.origin.io',
      ]);
    });
  });

  describe('exportAppKeyForAddress', () => {
    // reported error "Expected Uint8Array", no idea how to fix it
    it.skip('returns a unique key', async () => {
      const address = '0x01560cd3bac62cc6d7e6380600d9317363400896';
      const privateKey =
        '0xb8a9c05beeedb25df85f8d641538cbffedf67216048de9c678ee26260eb91952';
      await keyringService.addNewKeyring('Simple Key Pair', [privateKey]);
      const appKeyAddress = await keyringService.getAppKeyAddress(
        address,
        'someapp.origin.io'
      );

      const privateAppKey = await keyringService.exportAppKeyForAddress(
        address,
        'someapp.origin.io'
      );

      const wallet = Wallet.fromPrivateKey(Buffer.from(privateAppKey, 'hex'));
      const recoveredAddress = bytesToHex(wallet.getAddress());

      expect(recoveredAddress).toBe(appKeyAddress);
      expect(privateAppKey).not.toBe(privateKey);
    });
  });

  describe('forgetHardwareDevice', () => {
    it('throw when keyring is not hardware device', async () => {
      const privateKey =
        '0xb8a9c05beeedb25df85f8d641538cbffedf67216048de9c678ee26260eb91952';
      const keyring = await keyringService.addNewKeyring('Simple Key Pair', [
        privateKey,
      ]);
      expect(keyringService.keyrings).toHaveLength(1);
      expect(() => keyringService.forgetKeyring(keyring)).toThrow(
        new Error('keyringService.forgetKeyring is not a function')
      );
    });
  });

  describe('getKeyringForAccount', () => {
    it('throws error when address is not provided', async () => {
      await expect(
        keyringService.getKeyringForAccount(undefined)
      ).rejects.toThrow(
        new Error('No keyring found for the requested account.')
      );
    });

    it('throws error when there are no keyrings', async () => {
      keyringService.keyrings = [];
      await expect(keyringService.getKeyringForAccount('0x04')).rejects.toThrow(
        new Error('No keyring found for the requested account.')
      );
    });

    it('throws error when there are no matching keyrings', async () => {
      keyringService.keyrings = [
        {
          getAccounts() {
            return Promise.resolve([1, 2, 3]);
          },
        },
      ];
      await expect(keyringService.getKeyringForAccount('0x04')).rejects.toThrow(
        new Error('No keyring found for the requested account.')
      );
    });
  });
});
