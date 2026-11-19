/** @jest-environment node */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import ts from 'typescript';
import { ethErrors } from 'eth-rpc-errors';
import { TypedDataUtils, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { EthSafeTransaction } from '@safe-global/protocol-kit';
import Safe from '@rabby-wallet/gnosis-sdk';
import GnosisKeyring from '@/background/service/keyring/eth-gnosis-keyring';
import { normalizeSafeOperation } from '@/utils/gnosis';
import { createSigningOperation } from '@/utils/signEvent';

jest.mock('@rabby-wallet/gnosis-sdk', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@/constant', () => ({ EVENTS: {} }));

// Run production closures with isolated services, without mounting the wallet
// or starting its network-backed background services.
const load = (
  path: string,
  name: string,
  context: Record<string, unknown>,
  member = false
) => {
  const source = ts.createSourceFile(
    path,
    readFileSync(resolve(__dirname, '../../src', path), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  let declaration: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (
      (ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) &&
      node.name.getText(source) === name
    )
      declaration = node;
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!declaration) throw new Error(`Missing ${name}`);
  const code = member
    ? `export class Subject { #getKeyringByType() { return keyring; } ${declaration.getText(
        source
      )} }`
    : `export const ${declaration.getText(source)};`;
  const exports: Record<string, any> = {};
  runInNewContext(
    ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    { ...context, exports }
  );
  return member ? new exports.Subject()[name] : exports[name];
};

const SAFE_A = '0x1111111111111111111111111111111111111111';
const SAFE_B = '0x2222222222222222222222222222222222222222';
const ZERO = '0x0000000000000000000000000000000000000000';
const TX_A = {
  to: SAFE_B,
  value: '1',
  data: '0xab',
  nonce: 1,
  operation: 0,
  safeTxGas: '100',
  baseGas: '0',
  gasPrice: '0',
  gasToken: ZERO,
  refundReceiver: ZERO,
};
const hash = (data: any) =>
  `0x${TypedDataUtils.eip712Hash(data, SignTypedDataVersion.V4).toString(
    'hex'
  )}`;
const signTxPath = 'ui/views/Approval/components/SignTx.tsx';

describe('Safe reviewed transaction binding', () => {
  let keyring: GnosisKeyring;
  let approval: any;
  let unlocked: boolean;
  let context: any;

  beforeEach(() => {
    keyring = new GnosisKeyring({
      accounts: [SAFE_A],
      networkIdsMap: { [SAFE_A]: ['1'] },
    });
    keyring.safeInstance = {
      safeAddress: SAFE_A,
      version: '1.3.0',
      network: '1',
    } as any;
    keyring.currentTransaction = new EthSafeTransaction(TX_A);
    approval = {
      id: 'approval-A',
      data: {
        approvalComponent: 'SignTx',
        params: {
          data: [{ chainId: 1, isViewGnosisSafe: true }],
          $ctx: { safeTxHash: hash(keyring.generateTypedData()) },
        },
      },
    };
    keyring.currentTransactionHash = approval.data.params.$ctx.safeTxHash;
    unlocked = true;
    const gnosisGenerateTypedData = load(
      'background/controller/wallet.ts',
      'gnosisGenerateTypedData',
      {
        keyring,
        ethErrors,
        TypedDataUtils,
        SignTypedDataVersion,
        KEYRING_CLASS: { GNOSIS: 'Gnosis' },
        keyringService: { isUnlocked: () => unlocked },
        notificationService: { getApproval: () => approval },
      },
      true
    );
    context = {
      params: {
        data: [{ operation: 0, safeTxHash: keyring.currentTransactionHash }],
      },
      createSigningOperation,
      origin: 'https://safe.example',
      getSafeOperation: normalizeSafeOperation,
      normalizeSafeOperation,
      wallet: {
        gnosisGenerateTypedData,
        signTypedDataWithUI: jest.fn(),
        buildGnosisTransaction: jest.fn(
          async () => keyring.currentTransactionHash
        ),
      },
      resolveApproval: jest.fn(),
      canSubmitCurrentApproval: async () => true,
      currentGnosisAdmin: { type: 'software', address: SAFE_B },
      safeInfo: { version: '1.3.0' },
      activeApprovalPopup: () => false,
      KEYRING_TYPE: { HdKeyring: 'mnemonic' },
      WaitingSignMessageComponent: { software: 'PrivatekeyWaiting' },
      tx: { from: SAFE_A, to: SAFE_B, value: '0x1', data: '0xab' },
      safeTxGas: '100',
      realNonce: '0x1',
      approvalId: 'approval-A',
      chain: { network: '1' },
      isGnosisAccount: true,
      isViewGnosisSafe: true,
      isSend: false,
    };
  });

  const sign = () => load(signTxPath, 'handleGnosisSign', context)();

  test('signs the reviewed proposal when its hash and nonce still match', async () => {
    await sign();
    expect(context.wallet.signTypedDataWithUI).toHaveBeenCalledWith(
      'software',
      SAFE_B,
      keyring.generateTypedData(),
      expect.objectContaining({ sourceApprovalId: 'approval-A' })
    );
  });

  test.each([
    'proposal',
    'Safe',
    'chain',
    'nonce',
    'approval',
    'component',
    'missing hash',
    'lock',
  ])('rejects a changed %s before any signing call', async (changed) => {
    if (changed === 'proposal')
      keyring.currentTransaction = new EthSafeTransaction({
        ...TX_A,
        value: '999',
      });
    if (changed === 'Safe') keyring.safeInstance!.safeAddress = SAFE_B;
    if (changed === 'chain') keyring.safeInstance!.network = '10';
    if (changed === 'nonce') context.realNonce = '0x2';
    if (changed === 'approval') approval.id = 'approval-B';
    if (changed === 'component')
      approval.data.approvalComponent = 'SignTypedData';
    if (changed === 'missing hash') delete approval.data.params.$ctx.safeTxHash;
    if (changed === 'lock') unlocked = false;
    await expect(sign()).rejects.toMatchObject({ code: 4001 });
    expect(context.wallet.signTypedDataWithUI).not.toHaveBeenCalled();
    expect(context.resolveApproval).not.toHaveBeenCalled();
  });

  test('checks the network even for pre-1.3 Safes whose typed-data domain omits it', async () => {
    keyring.safeInstance!.version = '1.1.1';
    approval.data.params.$ctx.safeTxHash = hash(keyring.generateTypedData());
    keyring.currentTransactionHash = approval.data.params.$ctx.safeTxHash;
    context.params.data[0].safeTxHash = keyring.currentTransactionHash;
    await sign();
    context.wallet.signTypedDataWithUI.mockClear();
    keyring.safeInstance!.network = '10';
    await expect(sign()).rejects.toMatchObject({ code: 4001 });
    expect(context.wallet.signTypedDataWithUI).not.toHaveBeenCalled();
  });

  test.each([undefined, 0, 1, '0', '1', '0x0', '0x1'])(
    'uses the simulated operation %s when constructing a new Safe transaction',
    async (operation) => {
      context.isViewGnosisSafe = false;
      approval.data.params.data[0].isViewGnosisSafe = false;
      context.params.data[0].operation = operation;
      const delegateCall = load(signTxPath, 'delegateCall', context);
      await sign();
      expect(context.wallet.buildGnosisTransaction).toHaveBeenCalledWith(
        SAFE_A,
        context.currentGnosisAdmin,
        expect.objectContaining({ operation: delegateCall ? 1 : 0 }),
        '1.3.0',
        '1'
      );
    }
  );

  test.each([null, true, 2, '', '0x2'])(
    'rejects an invalid operation %j',
    (operation) => {
      expect(() => normalizeSafeOperation(operation)).toThrow('Invalid Safe');
    }
  );

  test('returns its own transaction hash even when another build completes concurrently', async () => {
    let finishA!: (tx: EthSafeTransaction) => void;
    const pendingA = new Promise<EthSafeTransaction>((resolve) => {
      finishA = resolve;
    });
    const safe = {
      ...keyring.safeInstance!,
      buildTransaction: jest
        .fn()
        .mockReturnValueOnce(pendingA)
        .mockResolvedValueOnce(
          new EthSafeTransaction({ ...TX_A, value: '999' })
        ),
      getTransactionHash: jest.fn(async (tx) =>
        tx.data.value === '1' ? 'original-hash' : 'replacement-hash'
      ),
    };
    ((Safe as unknown) as jest.Mock).mockImplementation(() => safe);
    const a = keyring.buildTransaction(SAFE_A, TX_A, {}, '1.3.0', '1');
    await keyring.buildTransaction(
      SAFE_A,
      { ...TX_A, value: '999' },
      {},
      '1.3.0',
      '1'
    );
    finishA(new EthSafeTransaction(TX_A));
    expect(await a).toBe('original-hash');
  });

  test('View passes the selected proposal hash into its queued approval', async () => {
    const data = {
      ...TX_A,
      safe: SAFE_A,
      safeTxHash: 'proposal-A',
      confirmations: [],
    };
    const wallet = {
      getCurrentAccount: async () => ({ address: SAFE_A }),
      buildGnosisTransaction: jest.fn(),
      setGnosisTransactionHash: jest.fn(),
      gnosisAddPureSignature: jest.fn(),
      sendRequest: jest.fn(),
    };
    await load(
      'ui/views/GnosisQueue/components/GnosisTransactionQueue/GnosisTransactionQueueList.tsx',
      'handleView',
      {
        data,
        wallet,
        networkId: '1',
        safeInfo: { owners: [SAFE_B], version: '1.3.0' },
        setIsLoading: jest.fn(),
        toChecksumAddress: (a: string) => a,
        intToHex: (n: number) => `0x${n.toString(16)}`,
        KEYRING_CLASS: { WATCH: 'Watch' },
        UI_TYPE: { isPop: false },
      }
    )();
    expect(wallet.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({ $ctx: { safeTxHash: 'proposal-A' } })
    );
  });
});
