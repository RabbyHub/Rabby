import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import ts from 'typescript';
import { ethErrors } from 'eth-rpc-errors';
import { isEqual, omit } from 'lodash';
import { assertApprovalSigningBinding } from '@/background/controller/walletUtils/approvalSigning';

// Load the actual controller methods with isolated services, so their approval
// checks run without starting the extension or contacting a Safe service.
const filename = resolve(
  __dirname,
  '../../src/background/controller/wallet.ts'
);
const source = ts.createSourceFile(
  filename,
  readFileSync(filename, 'utf8'),
  ts.ScriptTarget.Latest,
  true
);
const controllerClass = source.statements.find(
  (node): node is ts.ClassDeclaration =>
    ts.isClassDeclaration(node) && node.name?.text === 'WalletController'
)!;
const methods = controllerClass.members
  .filter((member) =>
    [
      'prepareGnosisTransaction',
      'submitGnosisTransactionSignature',
      'signTypedData',
    ].includes(member.name?.getText(source) || '')
  )
  .map((member) => member.getText(source))
  .join('\n');
const compiled = ts.transpileModule(
  `export class Controller { #getKeyringByType() { return gnosisKeyring; } ${methods} }`,
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;
const SAFE = '0x1111111111111111111111111111111111111111';
const OWNER = '0x2222222222222222222222222222222222222222';
const account = { address: OWNER, type: 'software', brandName: 'software' };
const typedData = {
  domain: { verifyingContract: SAFE, chainId: '1' },
  message: { to: OWNER, operation: 1 },
};

describe('Safe approval controller boundaries', () => {
  let currentApproval: any;
  let unlocked: boolean;
  let controller: any;
  let gnosisKeyring: any;
  let keyringService: any;
  const waiting = () => ({
    id: 'waiting-A',
    data: {
      approvalComponent: 'PrivatekeyWaiting',
      account,
      params: {
        sourceApprovalId: 'approval-A',
        gnosisTransactionHash: 'hash-A',
        approvalComponent: 'PrivatekeyWaiting',
        isGnosis: true,
        type: account.type,
        account,
        address: OWNER,
        data: [OWNER, JSON.stringify(typedData)],
      },
    },
  });
  const options = {
    sourceApprovalId: 'approval-A',
    gnosisTransactionHash: 'hash-A',
    approvalComponent: 'PrivatekeyWaiting',
  };

  beforeEach(() => {
    unlocked = true;
    currentApproval = waiting();
    gnosisKeyring = {
      prepareTransactionForApproval: jest.fn(async (args) => {
        args.assertCurrentApproval();
        return { typedData, transactionHash: 'hash-A' };
      }),
      submitApprovalSignature: jest.fn(async () => undefined),
      getApprovalTypedData: jest.fn(() => typedData),
    };
    keyringService = {
      isUnlocked: () => unlocked,
      getKeyringForAccount: jest.fn(async () => ({})),
      signTypedMessage: jest.fn(async () => 'signature-A'),
    };
    const exports: any = {};
    runInNewContext(compiled, {
      exports,
      gnosisKeyring,
      keyringService,
      ethErrors,
      isEqual,
      omit,
      notificationService: { getApproval: () => currentApproval },
      KEYRING_CLASS: { GNOSIS: 'Gnosis' },
      isSameAddress: (a: string, b: string) =>
        a.toLowerCase() === b.toLowerCase(),
      EthereumProvider: class {},
      ethers: { providers: { Web3Provider: class {} } },
      assertApprovalSigningBinding,
      eventBus: { emit: jest.fn() },
      EVENTS: {},
    });
    controller = new exports.Controller();
  });

  const submit = () =>
    controller.submitGnosisTransactionSignature(
      'approval-A',
      'hash-A',
      OWNER,
      'signature-A'
    );

  test('submits only the snapshot named by the current waiting approval', async () => {
    await submit();
    expect(gnosisKeyring.submitApprovalSignature).toHaveBeenCalledWith(
      'approval-A',
      'hash-A',
      OWNER,
      'signature-A'
    );
  });

  test.each(['locked', 'cancelled', 'source', 'hash', 'component', 'signer'])(
    'rejects a %s submission before touching its Safe snapshot',
    async (change) => {
      if (change === 'locked') unlocked = false;
      if (change === 'cancelled') currentApproval = null;
      if (change === 'source')
        currentApproval.data.params.sourceApprovalId = 'approval-B';
      if (change === 'hash')
        currentApproval.data.params.gnosisTransactionHash = 'hash-B';
      if (change === 'component')
        currentApproval.data.approvalComponent = 'SignTx';
      if (change === 'signer')
        currentApproval.data.params.account = { ...account, address: SAFE };
      await expect(submit()).rejects.toMatchObject({ code: 4001 });
      expect(gnosisKeyring.submitApprovalSignature).not.toHaveBeenCalled();
    }
  );

  test('checks signed data against the snapshot in addition to the waiting payload', async () => {
    const changed = { ...typedData, message: { to: SAFE, operation: 0 } };
    currentApproval.data.params.data[1] = JSON.stringify(changed);
    await expect(
      controller.signTypedData(account.type, OWNER, changed, options)
    ).rejects.toMatchObject({ code: 4001 });
    expect(keyringService.signTypedMessage).not.toHaveBeenCalled();
  });

  test('signs the matching snapshot and strips approval metadata from device options', async () => {
    await controller.signTypedData(account.type, OWNER, typedData, {
      ...options,
      version: 'V4',
    });
    expect(keyringService.signTypedMessage).toHaveBeenCalledWith(
      {},
      { from: OWNER, data: typedData },
      { version: 'V4' }
    );
  });

  test('prepares a viewed proposal using the hash and confirmations captured in its own approval', async () => {
    const proposal = {
      hash: 'reviewed-hash',
      confirmations: [{ owner: OWNER, signature: 'existing' }],
    };
    currentApproval = {
      id: 'approval-A',
      data: {
        approvalComponent: 'SignTx',
        account: { address: SAFE },
        params: {
          data: [{ isViewGnosisSafe: true }],
          $ctx: { gnosisTransaction: proposal },
        },
      },
    };
    await controller.prepareGnosisTransaction({
      approvalId: 'approval-A',
      account,
      tx: { from: SAFE, to: OWNER },
      version: '1.3.0',
      networkId: '1',
    });
    expect(gnosisKeyring.prepareTransactionForApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalId: 'approval-A',
        expectedHash: proposal.hash,
        confirmations: proposal.confirmations,
      })
    );
    const recheck =
      gnosisKeyring.prepareTransactionForApproval.mock.calls[0][0]
        .assertCurrentApproval;
    currentApproval = { ...currentApproval, id: 'approval-B' };
    expect(recheck).toThrow();
  });
});
