import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import ts from 'typescript';
import { normalizeSafeOperation } from '@/utils/gnosis';

// Exercise the production handlers without mounting the full signing screen
// and its network-backed hooks.
const loadHandler = (
  path: string,
  name: string,
  context: Record<string, unknown>
) => {
  const filename = resolve(__dirname, '../../src', path);
  const source = ts.createSourceFile(
    filename,
    readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  let declaration: ts.VariableDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name)
      declaration = node;
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!declaration) throw new Error(`Missing production handler ${name}`);
  const compiled = ts.transpileModule(
    `export const ${declaration.getText(source)};`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText;
  const exports: Record<string, any> = {};
  runInNewContext(compiled, { ...context, exports });
  return exports[name];
};

const signTxPath = 'ui/views/Approval/components/SignTx.tsx';
const queuePath =
  'ui/views/GnosisQueue/components/GnosisTransactionQueue/GnosisTransactionQueueList.tsx';
const SAFE = '0x1111111111111111111111111111111111111111';
const OWNER = '0x2222222222222222222222222222222222222222';

describe('Safe approval UI', () => {
  test.each([undefined, 0, 1, '0', '1', '0x0', '0x1'])(
    'simulates and prepares the same operation for %s',
    async (operation) => {
      const prepared = {
        typedData: {
          message: { operation: normalizeSafeOperation(operation) },
        },
        transactionHash: 'hash-A',
      };
      const wallet = {
        prepareGnosisTransaction: jest.fn(async () => prepared),
        signTypedDataWithUI: jest.fn(),
      };
      const resolveApproval = jest.fn();
      const params = { data: [{ operation }] };
      const context = {
        params,
        wallet,
        resolveApproval,
        normalizeSafeOperation,
        isGnosisAccount: true,
        isViewGnosisSafe: false,
        canSubmitCurrentApproval: async () => true,
        currentGnosisAdmin: { type: 'software', address: OWNER },
        safeInfo: { version: '1.3.0' },
        activeApprovalPopup: () => false,
        KEYRING_TYPE: { HdKeyring: 'mnemonic' },
        WaitingSignMessageComponent: { software: 'PrivatekeyWaiting' },
        tx: { from: SAFE, to: OWNER, value: '0x10', data: '0xab' },
        safeTxGas: '100000',
        realNonce: '0x0',
        approvalId: 'approval-A',
        chain: { network: '1' },
        isSend: false,
      };
      const simulatedDelegateCall = loadHandler(
        signTxPath,
        'delegateCall',
        context
      );
      await loadHandler(signTxPath, 'handleGnosisSign', context)();
      expect(wallet.prepareGnosisTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalId: 'approval-A',
          tx: expect.objectContaining({
            operation: simulatedDelegateCall ? 1 : 0,
            nonce: 0,
          }),
        })
      );
      expect(wallet.signTypedDataWithUI).toHaveBeenCalledWith(
        'software',
        OWNER,
        prepared.typedData,
        expect.objectContaining({
          sourceApprovalId: 'approval-A',
          gnosisTransactionHash: 'hash-A',
          approvalComponent: 'PrivatekeyWaiting',
        })
      );
      expect(resolveApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceApprovalId: 'approval-A',
          gnosisTransactionHash: 'hash-A',
          approvalComponent: 'PrivatekeyWaiting',
        })
      );
    }
  );

  test("View queues the complete proposal without replacing another approval's background state", async () => {
    const data = {
      safe: SAFE,
      to: OWNER,
      value: '1234567890123456789',
      data: '0xabcd',
      nonce: 0,
      safeTxGas: '100',
      gasPrice: '1234567890123456789',
      baseGas: '200',
      operation: 1,
      gasToken: OWNER,
      refundReceiver: OWNER,
      safeTxHash: 'hash-B',
      confirmations: [{ owner: OWNER, signature: 'signature-B' }],
    };
    const wallet = {
      sendRequest: jest.fn(),
      buildGnosisTransaction: jest.fn(),
      setGnosisTransactionHash: jest.fn(),
      gnosisAddPureSignature: jest.fn(),
    };
    const handleView = loadHandler(queuePath, 'handleView', {
      data,
      wallet,
      networkId: '1',
      setIsLoading: jest.fn(),
      toChecksumAddress: (address: string) => address,
      numberToHex: (value: bigint) => `0x${value.toString(16)}`,
      intToHex: (value: number) => `0x${value.toString(16)}`,
      UI_TYPE: { isPop: false },
    });
    await handleView();
    expect(wallet.buildGnosisTransaction).not.toHaveBeenCalled();
    expect(wallet.setGnosisTransactionHash).not.toHaveBeenCalled();
    expect(wallet.gnosisAddPureSignature).not.toHaveBeenCalled();
    expect(wallet.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        params: [
          expect.objectContaining({
            value: '0x112210f47de98115',
            nonce: '0x0',
            gasPrice: '0x112210f47de98115',
            gasToken: OWNER,
            refundReceiver: OWNER,
            operation: 1,
          }),
        ],
        $ctx: {
          gnosisTransaction: {
            hash: 'hash-B',
            confirmations: data.confirmations,
          },
        },
      })
    );
  });
});
