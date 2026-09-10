import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';
import { ethErrors } from 'eth-rpc-errors';
import { isHex as isHexString, stringToHex } from 'viem';
import { isString } from 'lodash';
import { KEYRING_TYPE, INTERNAL_REQUEST_SESSION } from '@/constant';
import { assertProviderRequest } from '@/background/utils/assertProviderRequest';
import { directSigning } from '@/background/service/directSigning';
import { sameAccountRef, toAccountRef } from '@/utils/signingTypes';

// Compile complete production methods while replacing extension/device services.
// No copied cancellation guards: removing a production guard must fail these tests.
const load = (
  file: string,
  name: string,
  deps: Record<string, unknown>,
  receiver?: unknown
) => {
  const source = ts.createSourceFile(
    file,
    readFileSync(resolve(__dirname, '../../src', file), 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  let expression = '';
  const visit = (node: ts.Node) => {
    if (
      (ts.isPropertyDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name.getText(source) === name &&
      node.initializer
    ) {
      expression = node.initializer.getText(source);
    } else if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      expression = node.getText(source);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!expression) throw new Error(`Missing production method ${name}`);
  const compiled = ts.transpileModule(`const method = ${expression};`, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  return new Function(...Object.keys(deps), compiled + '\nreturn method;').call(
    receiver,
    ...Object.values(deps)
  );
};
const providerFile = 'background/controller/provider/controller.ts';
const walletFile = 'background/controller/wallet.ts';
const account = {
  address: '0x1111111111111111111111111111111111111111',
  type: 'Ledger',
  brandName: 'Ledger',
};
const origin = INTERNAL_REQUEST_SESSION.origin;
const assertSigningAttemptValid = load(
  providerFile,
  'assertSigningAttemptValid',
  {
    directSigning,
    ethErrors,
    toAccountRef,
    sameAccountRef,
    signingFlowService: {
      getFlow: () => {
        throw new Error('Mini must not use SigningFlow');
      },
    },
  }
);
const assertApprovalResult = load(providerFile, 'assertApprovalResult', {
  ethErrors,
});
const history = { createHistory: jest.fn() };
const keyringService = {
  isUnlocked: jest.fn(),
  getKeyringForAccount: jest.fn(),
  signPersonalMessage: jest.fn(),
  signTypedMessage: jest.fn(),
};
const start = load(walletFile, 'startDirectSigning', {
  directSigning,
  toAccountRef,
  ethErrors,
  keyringService,
  INTERNAL_REQUEST_SESSION,
  preferenceService: { getCurrentAccount: () => account },
});
const personalSign = load(
  providerFile,
  'personalSign',
  {
    assertSigningAttemptValid,
    assertProviderRequest,
    assertApprovalResult,
    KEYRING_TYPE,
    isString,
    isHexString,
    stringToHex,
    keyringService,
    signTextHistoryService: history,
    reportSignText: jest.fn(),
  },
  { _checkAddress: () => keyringService.getKeyringForAccount() }
);
const typedSign = load(walletFile, 'signTypedData', {
  directSigning,
  keyringService,
  assertApprovalActionCurrent: () => {
    throw new Error('Mini must not require an approval');
  },
});
beforeEach(() => {
  directSigning.cancelAll();
  jest.clearAllMocks();
  keyringService.isUnlocked.mockReturnValue(true);
  keyringService.getKeyringForAccount.mockReset().mockResolvedValue({});
  keyringService.signPersonalMessage.mockReset().mockResolvedValue('signature');
  keyringService.signTypedMessage.mockReset().mockResolvedValue('signature');
});
afterEach(() => directSigning.cancelAll());

it('starts only while unlocked, binds account/origin, and consumes a permission once', () => {
  keyringService.isUnlocked.mockReturnValue(false);
  expect(() => start()).toThrow();
  keyringService.isUnlocked.mockReturnValue(true);
  const id = start();
  expect(typeof id).toBe('string');
  expect(() => directSigning.assertCurrent(id, account, origin)).not.toThrow();
  expect(() =>
    directSigning.assertCurrent(id, { ...account, type: 'Private Key' }, origin)
  ).toThrow();
  expect(() =>
    directSigning.assertCurrent(id, account, 'https://other.test')
  ).toThrow();
  expect(directSigning.end(id)).toBe(true);
  expect(directSigning.end(id)).toBe(false);
  expect(() => directSigning.assertCurrent(id)).toThrow();
});

it('invalidates just the affected origin, and an old completion cannot consume a retry', () => {
  const old = directSigning.start(account, 'https://dapp.test');
  const other = directSigning.start(account, origin);
  directSigning.cancelAll('https://dapp.test');
  const retry = directSigning.start(account, 'https://dapp.test');
  expect(directSigning.end(old)).toBe(false);
  expect(() => directSigning.assertCurrent(other)).not.toThrow();
  expect(() => directSigning.assertCurrent(retry)).not.toThrow();
  directSigning.cancelAll();
  expect(directSigning.end(other)).toBe(false);
  expect(directSigning.end(retry)).toBe(false);
});

describe.each(['personal', 'typed'])(
  '%s direct signing await boundaries',
  (kind) => {
    const sign = (id) =>
      kind === 'personal'
        ? personalSign({
            account,
            session: INTERNAL_REQUEST_SESSION,
            directSigning: id,
            data: { params: ['0x1234', account.address] },
            approvalRes: { extra: {} },
          })
        : typedSign(
            account.type,
            account.address,
            {},
            { brandName: account.brandName },
            id
          );
    const device = () =>
      kind === 'personal'
        ? keyringService.signPersonalMessage
        : keyringService.signTypedMessage;
    it('returns its own result without an approval or execution flow', async () => {
      await expect(sign(start())).resolves.toBe('signature');
      expect(device()).toHaveBeenCalledTimes(1);
    });
    it('does not start the device after cancellation during account lookup', async () => {
      let resume!: () => void;
      keyringService.getKeyringForAccount.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resume = () => resolve({});
          })
      );
      const pending = sign(start());
      directSigning.cancelAll();
      resume();
      await expect(pending).rejects.toMatchObject({ code: 4001 });
      expect(device()).not.toHaveBeenCalled();
    });
    it('rejects a device result arriving after session invalidation', async () => {
      let finish!: () => void;
      device().mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = () => resolve('late');
          })
      );
      const pending = sign(start());
      await Promise.resolve();
      directSigning.cancelAll();
      finish();
      await expect(pending).rejects.toMatchObject({ code: 4001 });
      expect(history.createHistory).not.toHaveBeenCalled();
    });
  }
);
