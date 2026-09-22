import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';
import {
  KEYRING_IMPORT_EXPIRED,
  KEYRING_IMPORT_EXPIRED_MESSAGE,
} from '@/constant/message';

// Exercise the controller methods without booting every background service.
const source = ts.createSourceFile(
  'wallet.ts',
  readFileSync(
    resolve(__dirname, '../../src/background/controller/wallet.ts'),
    'utf8'
  ),
  ts.ScriptTarget.Latest,
  true
);
const methods: string[] = [];
function visit(node: ts.Node) {
  if (
    ts.isPropertyDeclaration(node) &&
    [
      'requestKeyring',
      '#getStashedKeyring',
      'connectHardware',
      'unlockHardwareAccount',
      'addKeyringToStash',
      'removeMnemonicKeyringFromStash',
    ].includes(node.name.getText(source))
  )
    methods.push(node.getText(source));
  ts.forEachChild(node, visit);
}
visit(source);

const compile = ts.transpileModule(
  `class Wallet {
    #getKeyringByType(type) { return getPersistedKeyring(type); }
    _setCurrentAccountFromKeyring(...args) { return selectCurrent(...args); }
    ${methods.join('\n')}
  }; new Wallet()`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
).outputText;

const createWallet = (persisted: any[] = []) => {
  const stashKeyrings: Record<number, any> = {};
  const getRandomValues = jest.fn((words: Uint32Array) => {
    words[0] = 1;
    words[1] = getRandomValues.mock.calls.length;
    return words;
  });
  const getPersistedKeyring = jest.fn((type: string) => {
    const keyring = persisted.find((item) => item.type === type);
    if (!keyring) throw new Error('No persisted keyring');
    return keyring;
  });
  const keyringService = {
    keyrings: persisted,
    getKeyringClassForType: jest.fn(
      (type: string) =>
        class {
          type = type;
          getAccounts = jest.fn().mockReturnValue([]);
          cleanUp = jest.fn();
        }
    ),
    persistAllKeyrings: jest.fn(),
    addKeyring: jest.fn(async (keyring) => {
      persisted.push(keyring);
      return keyring;
    }),
    addNewAccount: jest.fn(),
  };
  const selectCurrent = jest.fn();
  const wallet = runInNewContext(compile, {
    stashKeyrings,
    REQUEST_KEYRING_METHOD_ALLOWLIST: new Set(['getAccounts', 'cleanUp']),
    KEYRING_IMPORT_EXPIRED,
    KEYRING_IMPORT_EXPIRED_MESSAGE,
    KEYRING_CLASS: { HARDWARE: { GRIDPLUS: 'GridPlus' } },
    getPersistedKeyring,
    selectCurrent,
    keyringService,
    hasBridge: async () => false,
    crypto: { getRandomValues },
  });
  return {
    wallet,
    stashKeyrings,
    getRandomValues,
    getPersistedKeyring,
    keyringService,
    selectCurrent,
  };
};

test('a missing import session fails closed for account reads and has nothing left to clean up', async () => {
  const { wallet, getPersistedKeyring, keyringService } = createWallet();
  await expect(
    wallet.requestKeyring('HD Key Tree', 'getAccounts', 1)
  ).rejects.toMatchObject({
    code: 'KEYRING_IMPORT_EXPIRED',
  });
  await expect(
    wallet.requestKeyring('HD Key Tree', 'cleanUp', 1)
  ).resolves.toBeUndefined();
  expect(getPersistedKeyring).not.toHaveBeenCalled();
  expect(keyringService.getKeyringClassForType).not.toHaveBeenCalled();
});

test('invalid runtime IDs reject reads and cleanup without a fallback', async () => {
  const { wallet, getPersistedKeyring, keyringService } = createWallet();
  for (const id of [NaN, 0, -1, Infinity, 1.2, '__proto__', '1']) {
    for (const method of ['getAccounts', 'cleanUp']) {
      await expect(
        wallet.requestKeyring('HD Key Tree', method, id)
      ).rejects.toMatchObject({
        code: KEYRING_IMPORT_EXPIRED,
      });
    }
  }
  expect(getPersistedKeyring).not.toHaveBeenCalled();
  expect(keyringService.getKeyringClassForType).not.toHaveBeenCalled();
});

test('a stale import ID cannot invoke another type of keyring, including cleanup', async () => {
  const { wallet } = createWallet();
  const cleanUp = jest.fn();
  const getAccounts = jest.fn();
  const id = wallet.addKeyringToStash({ type: 'Ledger', cleanUp, getAccounts });
  for (const method of ['getAccounts', 'cleanUp']) {
    await expect(
      wallet.requestKeyring('HD Key Tree', method, id)
    ).rejects.toMatchObject({
      code: 'KEYRING_IMPORT_EXPIRED',
    });
  }
  expect(cleanUp).not.toHaveBeenCalled();
  expect(getAccounts).not.toHaveBeenCalled();
});

test('deleting an earlier import and allocating again never overwrites a live wallet', async () => {
  const { wallet, getRandomValues } = createWallet();
  const first = { type: 'HD Key Tree', mnemonic: 'first' };
  const second = {
    type: 'HD Key Tree',
    mnemonic: 'second',
    getAccounts: () => ['second-address'],
  };
  getRandomValues.mockImplementationOnce((words: Uint32Array) => words.fill(0));
  const firstId = wallet.addKeyringToStash(first);
  const secondId = wallet.addKeyringToStash(second);
  wallet.removeMnemonicKeyringFromStash(first);
  // A random collision must be retried, too.
  getRandomValues.mockImplementationOnce((words: Uint32Array) => {
    words[0] = Math.floor(secondId / 2 ** 32);
    words[1] = secondId >>> 0;
    return words;
  });
  const thirdId = wallet.addKeyringToStash({
    type: 'HD Key Tree',
    mnemonic: 'third',
  });
  expect(Number.isSafeInteger(thirdId)).toBe(true);
  expect(thirdId).toBeGreaterThan(0);
  expect(thirdId).not.toBe(firstId);
  expect(thirdId).not.toBe(secondId);
  await expect(
    wallet.requestKeyring('HD Key Tree', 'getAccounts', secondId)
  ).resolves.toEqual(['second-address']);
});

test('connecting different instances of one hardware type preserves each import reference, and reuses the same persisted instance', async () => {
  const { wallet, stashKeyrings, keyringService } = createWallet();
  const firstId = await wallet.connectHardware({ type: 'Ledger' });
  const first = stashKeyrings[firstId];
  const secondId = await wallet.connectHardware({ type: 'Ledger' });
  const second = stashKeyrings[secondId];
  expect(firstId).not.toBe(secondId);
  await wallet.requestKeyring('Ledger', 'cleanUp', firstId, true);
  expect(first.cleanUp).toHaveBeenCalledWith(true);
  expect(first.cleanUp.mock.contexts[0]).toBe(first);
  expect(second.cleanUp).not.toHaveBeenCalled();
  keyringService.keyrings.push(second);
  await expect(wallet.connectHardware({ type: 'Ledger' })).resolves.toBe(
    secondId
  );
});

test('an explicit hardware reference selects that exact instance and retains refreshed GridPlus pairing credentials', async () => {
  const first = { type: 'GridPlus', unlock: jest.fn() };
  const selected = {
    type: 'GridPlus',
    unlock: jest.fn(),
    consumePairingCredsRefreshed: () => true,
  };
  const { wallet, keyringService, getPersistedKeyring } = createWallet([
    first,
    selected,
  ]);
  const id = wallet.addKeyringToStash(selected);
  await expect(
    wallet.connectHardware({
      type: 'GridPlus',
      keyringId: id,
      needUnlock: true,
    })
  ).resolves.toBe(id);
  expect(selected.unlock).toHaveBeenCalledTimes(1);
  expect(first.unlock).not.toHaveBeenCalled();
  expect(getPersistedKeyring).not.toHaveBeenCalled();
  expect(keyringService.persistAllKeyrings).toHaveBeenCalledTimes(1);
  await expect(
    wallet.connectHardware({ type: 'GridPlus', keyringId: 1 })
  ).rejects.toMatchObject({ code: KEYRING_IMPORT_EXPIRED });
});

test('importing through a missing or conflicting stash reference never modifies the persisted hardware wallet', async () => {
  const persisted = { type: 'Ledger', setAccountToUnlock: jest.fn() };
  const selected = { type: 'Ledger', setAccountToUnlock: jest.fn() };
  const { wallet, keyringService, selectCurrent } = createWallet([persisted]);
  const id = wallet.addKeyringToStash(selected);
  for (const staleId of [id, 1]) {
    await expect(
      wallet.unlockHardwareAccount('Ledger', [3], staleId)
    ).rejects.toMatchObject({ code: KEYRING_IMPORT_EXPIRED });
  }
  expect(persisted.setAccountToUnlock).not.toHaveBeenCalled();
  expect(selected.setAccountToUnlock).not.toHaveBeenCalled();
  expect(keyringService.addKeyring).not.toHaveBeenCalled();
  expect(keyringService.addNewAccount).not.toHaveBeenCalled();
  expect(selectCurrent).not.toHaveBeenCalled();
});

test('a valid hardware import persists only the selected instance and keeps using it for subsequent accounts', async () => {
  const selected = { type: 'Ledger', setAccountToUnlock: jest.fn() };
  const { wallet, keyringService, selectCurrent } = createWallet();
  const id = wallet.addKeyringToStash(selected);
  await wallet.unlockHardwareAccount('Ledger', [3], id);
  await wallet.unlockHardwareAccount('Ledger', [4], id);
  expect(keyringService.addKeyring).toHaveBeenCalledTimes(1);
  expect(keyringService.addKeyring).toHaveBeenCalledWith(selected);
  expect(selected.setAccountToUnlock.mock.calls).toEqual([[3], [4]]);
  expect(keyringService.addNewAccount.mock.calls).toEqual([
    [selected],
    [selected],
  ]);
  expect(selectCurrent).toHaveBeenLastCalledWith(selected, -1);
});

test('an already persisted explicit hardware reference takes precedence over the first instance of its type', async () => {
  const first = { type: 'Ledger', setAccountToUnlock: jest.fn() };
  const selected = { type: 'Ledger', setAccountToUnlock: jest.fn() };
  const { wallet, keyringService } = createWallet([first, selected]);
  const id = wallet.addKeyringToStash(selected);
  await wallet.unlockHardwareAccount('Ledger', [3], id);
  expect(first.setAccountToUnlock).not.toHaveBeenCalled();
  expect(keyringService.addNewAccount).toHaveBeenCalledWith(selected);
  expect(keyringService.addKeyring).not.toHaveBeenCalled();
});
