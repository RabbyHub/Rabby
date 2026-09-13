import type { Approval } from '@/background/service/notification';
import { assertApprovalSigningBinding } from '@/background/controller/walletUtils/approvalSigning';
import { SigningFlowService } from '@/background/service/signingFlow';
import {
  toApprovalRef,
  SigningAttemptRef,
  SigningFlowRef,
} from '@/utils/signingTypes';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import {
  createSourceFile,
  isClassDeclaration,
  ScriptTarget,
  ModuleKind,
  transpileModule,
} from 'typescript';
import { ethErrors } from 'eth-rpc-errors';
import { omit } from 'lodash';

jest.mock('@sentry/browser', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

const address = '0x123';
const typedData = { domain: { chainId: 1 }, message: { amount: '100' } };
const request = {
  type: 'HD Key Tree',
  from: address,
  data: typedData,
  options: {
    sourceApprovalId: 'reviewed-request',
    approvalComponent: 'PrivatekeyWaiting' as const,
  },
};
const makeApproval = (): Approval => ({
  id: 'waiting-request',
  taskId: null,
  winProps: {},
  data: {
    account: { address, type: request.type, brandName: 'Seed phrase' },
    approvalComponent: 'PrivatekeyWaiting',
    params: {
      sourceApprovalId: request.options.sourceApprovalId,
      isGnosis: true,
      type: request.type,
      address,
      data: [address, JSON.stringify(typedData)],
    },
  },
});

describe('bound deferred Safe signing', () => {
  let currentApproval: Approval | null;
  let signingFlow: SigningFlowService;
  let flow: SigningFlowRef;
  let attempt: SigningAttemptRef;
  let keyringLookup: jest.Mock;
  let signTypedMessage: jest.Mock;
  let signTypedData: (...args: any[]) => Promise<unknown>;
  const flush = async () => {
    for (let index = 0; index < 10; index++) await Promise.resolve();
  };

  beforeEach(() => {
    currentApproval = makeApproval();
    signingFlow = new SigningFlowService();
    flow = signingFlow.createFlow({
      origin: 'https://dapp.test',
      rpcRequestId: 'safe',
    });
    attempt = signingFlow.createAttempt(flow)!;
    signingFlow.bindAttemptApproval(
      attempt,
      toApprovalRef(currentApproval.id, 'PrivatekeyWaiting')
    );
    keyringLookup = jest.fn().mockResolvedValue({});
    signTypedMessage = jest.fn().mockResolvedValue('signature');
    // Exercise the actual signing method and its post-await binding check without
    // constructing the extension's unrelated controller services.
    const source = readFileSync(
      resolve(__dirname, '../../src/background/controller/wallet.ts'),
      'utf8'
    );
    const ast = createSourceFile(
      'wallet.ts',
      source,
      ScriptTarget.Latest,
      true
    );
    const controller = ast.statements.find(
      (node) =>
        isClassDeclaration(node) && node.name?.text === 'WalletController'
    );
    if (!controller || !isClassDeclaration(controller))
      throw new Error('Missing WalletController');
    const method = controller.members.find(
      (node) => node.name?.getText(ast) === 'signTypedData'
    );
    if (!method) throw new Error('Missing production signTypedData');
    const guard = source.slice(
      source.indexOf('const assertApprovalActionCurrent ='),
      source.indexOf('const gnosisPQueue =')
    );
    const compiled = transpileModule(
      `${guard}
class SigningController { ${method.getText(ast)} }
exports.signTypedData = new SigningController().signTypedData;`,
      {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          target: ScriptTarget.ES2020,
        },
      }
    ).outputText;
    const exports: any = {};
    runInNewContext(compiled, {
      exports,
      ethErrors,
      omit,
      assertApprovalSigningBinding,
      notificationService: {
        getCurrentApproval: () => currentApproval,
        isApprovalRefCurrent: (ref: {
          approvalId: string;
          component: string;
        }) =>
          currentApproval?.id === ref.approvalId &&
          currentApproval?.data.approvalComponent === ref.component,
      },
      signingFlowService: signingFlow,
      keyringService: { getKeyringForAccount: keyringLookup, signTypedMessage },
    });
    signTypedData = exports.signTypedData;
  });

  const waitForApproval = (sign: () => void) =>
    signingFlow.run(flow, attempt, async () => {
      const result = await signTypedData(
        request.type,
        request.from,
        request.data,
        request.options,
        {
          approval: toApprovalRef('waiting-request', 'PrivatekeyWaiting'),
          signing: { flow, attempt },
        }
      );
      sign();
      return result;
    });

  test('signs only after the matching waiting approval mounts', async () => {
    const sign = jest.fn();
    const pending = waitForApproval(sign);
    expect(sign).not.toHaveBeenCalled();
    signingFlow.markUiReady(attempt);
    await pending;
    expect(sign).toHaveBeenCalledTimes(1);
  });

  test.each([
    [
      'source id',
      (approval: Approval) => {
        approval.data.params.sourceApprovalId = 'other-source';
      },
    ],
    [
      'component',
      (approval: Approval) => {
        approval.data.approvalComponent = 'LedgerHardwareWaiting';
      },
    ],
    [
      'Safe marker',
      (approval: Approval) => {
        approval.data.params.isGnosis = false;
      },
    ],
    [
      'signer address',
      (approval: Approval) => {
        approval.data.params.address = '0x456';
      },
    ],
    [
      'payload signer',
      (approval: Approval) => {
        approval.data.params.data[0] = '0x456';
      },
    ],
    [
      'account',
      (approval: Approval) => {
        approval.data.account.address = '0x456';
      },
    ],
    [
      'account type',
      (approval: Approval) => {
        approval.data.account.type = 'Other type';
      },
    ],
    [
      'typed payload',
      (approval: Approval) => {
        approval.data.params.data[1] = JSON.stringify({
          ...typedData,
          message: { amount: '999' },
        });
      },
    ],
  ] as const)(
    'rejects mismatched %s after the waiting attempt becomes ready',
    async (_name, change) => {
      const sign = jest.fn();
      const pending = waitForApproval(sign);
      change(currentApproval!);
      signingFlow.markUiReady(attempt);
      await expect(pending).rejects.toMatchObject({ code: 4001 });
      expect(sign).not.toHaveBeenCalled();
    }
  );

  test('an old listener cannot sign after the pending approval is cleared', async () => {
    const sign = jest.fn();
    const pending = waitForApproval(sign);
    currentApproval = null;
    signingFlow.markUiReady(attempt);
    await expect(pending).rejects.toMatchObject({ code: 4001 });
    expect(sign).not.toHaveBeenCalled();
  });

  test('failed source consent cannot be supplied by a later unrelated waiting approval', async () => {
    const sign = jest.fn();
    const pending = waitForApproval(sign);
    currentApproval = makeApproval();
    currentApproval.data.params.sourceApprovalId = 'next-request';
    signingFlow.markUiReady(attempt);
    await expect(pending).rejects.toMatchObject({ code: 4001 });
    expect(sign).not.toHaveBeenCalled();
  });

  test.each(['source', 'payload', 'cleared'])(
    'the production signing method rechecks %s after keyring lookup',
    async (change) => {
      let finishKeyringLookup!: (keyring: object) => void;
      keyringLookup.mockReturnValue(
        new Promise<object>((resolve) => {
          finishKeyringLookup = resolve;
        })
      );
      const sign = jest.fn();
      const pending = waitForApproval(sign);
      signingFlow.markUiReady(attempt);
      await flush();
      expect(keyringLookup).toHaveBeenCalledTimes(1);
      if (change === 'cleared') currentApproval = null;
      else if (change === 'source')
        currentApproval!.data.params.sourceApprovalId = 'replaced';
      else
        currentApproval!.data.params.data[1] = JSON.stringify({
          message: { amount: '999' },
        });
      finishKeyringLookup({});
      await expect(pending).rejects.toMatchObject({ code: 4001 });
      expect(signTypedMessage).not.toHaveBeenCalled();
      expect(sign).not.toHaveBeenCalled();
    }
  );

  test('a different attempt becoming ready does not start this signature', async () => {
    const other = signingFlow.createFlow({
      origin: 'https://dapp.test',
      rpcRequestId: 'other',
    });
    const otherAttempt = signingFlow.createAttempt(other)!;
    const sign = jest.fn();
    const pending = waitForApproval(sign);
    signingFlow.markUiReady(otherAttempt);
    await flush();
    expect(keyringLookup).not.toHaveBeenCalled();
    signingFlow.markUiReady(attempt);
    await expect(pending).resolves.toBe('signature');
    expect(signTypedMessage).toHaveBeenCalledWith(
      {},
      { from: address, data: typedData },
      {}
    );
  });

  test('cancelling the flow rejects its pending UI wait', async () => {
    const sign = jest.fn();
    const pending = waitForApproval(sign);
    signingFlow.cancelFlow(flow);
    signingFlow.markUiReady(attempt);
    await expect(pending).rejects.toMatchObject({ code: 4001 });
    expect(keyringLookup).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });

  test('fails closed for incomplete binding, while preserving legacy callers', () => {
    expect(() =>
      assertApprovalSigningBinding(currentApproval, {
        ...request,
        options: { sourceApprovalId: request.options.sourceApprovalId },
      })
    ).toThrow();
    expect(() =>
      assertApprovalSigningBinding(null, { ...request, options: undefined })
    ).not.toThrow();
  });
});
