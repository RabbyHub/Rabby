import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';

// Extract the real methods so the test does not boot every background service.
const extract = (file: string, names: string[]) => {
  const source = ts.createSourceFile(
    file,
    readFileSync(resolve(file), 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const blocks: Record<string, string> = {};
  const visit = (node: ts.Node) => {
    if (
      ts.isMethodDeclaration(node) &&
      names.includes(node.name.getText(source))
    ) {
      blocks[node.name.getText(source)] = node.getText(source);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  names.forEach((name) => {
    if (!blocks[name]) throw new Error(`Missing ${name}`);
  });
  return blocks;
};

const methods = extract('src/background/service/transactionHistory.ts', [
  'clearBefore',
  'removeFeatPendingByLocal',
]);

const address = '0xuser';
const chainId = 56;

const group = (nonce: number, isPending: boolean) => ({
  chainId,
  nonce,
  isPending,
  txs: [{ hash: `0xhash${nonce}` }],
});

const createService = () => {
  const store = {
    transactions: {
      [address]: {
        [`${chainId}-22`]: group(22, true),
        [`${chainId}-23`]: group(23, true),
        [`${chainId}-24`]: group(24, false),
        [`1-5`]: { ...group(5, true), chainId: 1 },
      },
    },
    swapTxHistory: [
      { address, chainId, hash: '0xhash22', status: 'pending' },
      { address, chainId, hash: '0xhash24', status: 'pending' },
    ],
    sendTxHistory: [{ address, chainId, hash: '0xhash23', status: 'pending' }],
    sendNftTxHistory: [],
    bridgeTxHistory: [],
  };
  const populate = jest.fn();
  const service = runInNewContext(
    ts.transpileModule(
      `new (class {
        store = store;
        _setStoreTransaction(input) { this.store.transactions = input; }
        _populateAvailableTxs() { populate(); }
        ${Object.values(methods).join('\n')}
      })()`,
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
    ).outputText,
    {
      store,
      populate,
      isSameAddress: (a: string, b: string) =>
        a.toLowerCase() === b.toLowerCase(),
    }
  );
  return { service, store, populate };
};

it('drops every older pending group on the chain without throwing', () => {
  const { service, store, populate } = createService();

  expect(() =>
    service.clearBefore({ address, chainId, nonce: 24 })
  ).not.toThrow();

  expect(Object.keys(store.transactions[address]).sort()).toEqual([
    '1-5',
    `${chainId}-24`,
  ]);
  expect(store.swapTxHistory.map((item) => item.hash)).toEqual(['0xhash24']);
  expect(store.sendTxHistory).toEqual([]);
  expect(populate).toHaveBeenCalledTimes(1);
});
