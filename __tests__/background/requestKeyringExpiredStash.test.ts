import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';
import { KEYRING_IMPORT_EXPIRED } from '@/constant/message';

// Run the real requestKeyring without booting every background service.
const source = ts.createSourceFile(
  'wallet.ts',
  readFileSync(
    resolve(__dirname, '../../src/background/controller/wallet.ts'),
    'utf8'
  ),
  ts.ScriptTarget.Latest,
  true
);
let requestKeyring = '';
const visit = (node: ts.Node) => {
  if (
    ts.isPropertyDeclaration(node) &&
    node.name.getText(source) === 'requestKeyring'
  ) {
    requestKeyring = node.getText(source);
  }
  ts.forEachChild(node, visit);
};
visit(source);

const createWallet = (stashKeyrings: Record<number, any>) =>
  runInNewContext(
    ts.transpileModule(
      `new (class { #getKeyringByType() { throw new Error("unused"); } ${requestKeyring} })()`,
      {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      }
    ).outputText,
    {
      stashKeyrings,
      KEYRING_IMPORT_EXPIRED,
      REQUEST_KEYRING_METHOD_ALLOWLIST: new Set(['getAccounts']),
    }
  );

test('a stash ID lost to a worker restart rejects with a coded error, not a TypeError', async () => {
  const error = await createWallet({})
    .requestKeyring('HD Key Tree', 'getAccounts', 1)
    .catch((e: unknown) => e);
  expect(error).not.toBeInstanceOf(TypeError);
  expect(error).toMatchObject({ code: KEYRING_IMPORT_EXPIRED });
});

test('a live stash ID still reaches its keyring', async () => {
  const keyring = { getAccounts: jest.fn().mockResolvedValue(['0xa']) };
  await expect(
    createWallet({ 7: keyring }).requestKeyring('HD Key Tree', 'getAccounts', 7)
  ).resolves.toEqual(['0xa']);
});
