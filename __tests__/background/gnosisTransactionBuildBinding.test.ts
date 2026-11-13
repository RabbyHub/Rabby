import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import ts from 'typescript';
import GnosisKeyring from '@/background/service/keyring/eth-gnosis-keyring';

const SAFE = '0xd553500000000000000000000000000000a533c0';
const OWNER = '0x57f2000000000000000000000000000000007758';
const TO_A = '0x1111111111111111111111111111111111111111';
const TO_B = '0x2222222222222222222222222222222222222222';
const HASH_A = `0x${'11'.repeat(32)}`;
const HASH_B = `0x${'22'.repeat(32)}`;
const mockNonceRPC = { pending: Promise.resolve() };

jest.mock('@rabby-wallet/gnosis-sdk', () => ({
  __esModule: true,
  default: class {
    constructor(
      public safeAddress: string,
      public version: string,
      _provider: unknown,
      public network: string
    ) {}

    async buildTransaction(tx: any) {
      // Both builds can share a pending nonce RPC before their hash RPCs hit
      // the cache. They then finish within the same microtask checkpoint.
      await mockNonceRPC.pending;
      const { EthSafeTransaction } = require('@safe-global/protocol-kit');
      const zero = '0x0000000000000000000000000000000000000000';
      return new EthSafeTransaction({
        ...tx,
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: zero,
        refundReceiver: zero,
        nonce: 0,
      });
    }

    async getTransactionHash(transaction: any) {
      return transaction.data.to === TO_A ? HASH_A : HASH_B;
    }
  },
}));

// Run the production wallet method with the real keyring without booting the
// background services. Only the provider setup and SDK RPC results are stubbed.
const file = resolve(__dirname, '../../src/background/controller/wallet.ts');
const source = ts.createSourceFile(
  file,
  readFileSync(file, 'utf8'),
  ts.ScriptTarget.Latest,
  true
);
let buildMethod: ts.PropertyDeclaration | undefined;
const visit = (node: ts.Node) => {
  if (
    ts.isPropertyDeclaration(node) &&
    node.name.getText(source) === 'buildGnosisTransaction'
  ) {
    buildMethod = node;
  }
  ts.forEachChild(node, visit);
};
visit(source);
if (!buildMethod) throw new Error('Missing production wallet build method');
const compiled = ts.transpileModule(
  `new (class {
    #getKeyringByType = () => keyring;
    ${buildMethod.getText(source)}
  })()`,
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }
).outputText;

const loadWallet = (keyring: GnosisKeyring) =>
  runInNewContext(compiled, {
    keyring,
    KEYRING_CLASS: { GNOSIS: 'Gnosis' },
    EthereumProvider: class {},
    ethers: { providers: { Web3Provider: class {} } },
    t: (key: string) => key,
  });

test.each([
  [TO_A, TO_B, HASH_A, HASH_B],
  [TO_B, TO_A, HASH_B, HASH_A],
])(
  'keeps each build hash and rejects signing %s after %s replaces it',
  async (firstTarget, secondTarget, firstHash, secondHash) => {
    const keyring = new GnosisKeyring();
    keyring.accounts = [SAFE];
    const wallet = loadWallet(keyring);
    const build = (to: string) =>
      wallet.buildGnosisTransaction(
        SAFE,
        { address: OWNER, type: 'Simple Key Pair' },
        { to, value: '0', data: '0x', operation: 0, nonce: 0 },
        '1.3.0',
        '1'
      );
    let releaseNonce!: () => void;
    mockNonceRPC.pending = new Promise<void>((resolve) => {
      releaseNonce = resolve;
    });

    const first = build(firstTarget);
    await Promise.resolve();
    const second = build(secondTarget);
    releaseNonce();

    const hashes = await Promise.all([first, second]);
    expect(hashes).toEqual([firstHash, secondHash]);
    expect(() => keyring.generateTypedData(hashes[0])).toThrow(
      'Safe transaction changed'
    );
    expect(keyring.generateTypedData(hashes[1])?.message.to).toBe(secondTarget);
  }
);
