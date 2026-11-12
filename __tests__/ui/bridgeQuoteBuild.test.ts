import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { isSameBridgeQuote } from '@/ui/views/Bridge/utils/bridgeQuote';

// Exercise the actual callback without loading the unrelated wallet UI.
const filename = path.resolve(
  __dirname,
  '../../src/ui/views/Bridge/Component/BridgeContent.tsx'
);
const source = ts.createSourceFile(
  filename,
  fs.readFileSync(filename, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
let callback: string | undefined;
const visit = (node: ts.Node) => {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === 'buildTxs' &&
    node.initializer &&
    ts.isCallExpression(node.initializer)
  ) {
    callback = node.initializer.arguments[0].getText(source);
  }
  ts.forEachChild(node, visit);
};
visit(source);
if (!callback) throw new Error('Cannot locate Bridge buildTxs callback');
const compiled = ts.transpileModule(`const buildTxs = ${callback};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(failureStage: 'quote' | 'wallet' = 'quote') {
  const oldQuote = {
    aggregator: { id: 'relay' },
    bridge_id: 'relay',
    quote_key: { quote_id: 'old' },
  };
  const otherQuote = { ...oldQuote, aggregator: { id: 'socket' } };
  let quotes = [oldQuote, otherQuote];
  let reject!: (reason: Error) => void;
  const pending = new Promise((_, rejectPromise) => {
    reject = rejectPromise;
  });
  const buildKey = { current: 'old' };
  const requestId = { current: 1 };
  const requestBridgeQuoteTx = jest.fn(() =>
    failureStage === 'quote' ? pending : Promise.resolve({})
  );
  const wallet = {
    openapi: {},
    buildBridgeToken: jest.fn(() =>
      failureStage === 'wallet' ? pending : Promise.resolve([])
    ),
  };
  const setQuotesList = jest.fn((update) => {
    quotes = update(quotes);
  });
  const scope = {
    inSufficient: false,
    fromToken: { chain: 'arb', id: 'arb' },
    toToken: { chain: 'base', id: 'base' },
    selectedBridgeQuote: oldQuote,
    selectedBridgeQuoteBuildKeyRef: buildKey,
    quoteRequestIdRef: requestId,
    requestBridgeQuoteTx,
    userAddress: `0x${'11'.repeat(20)}`,
    amount: '1',
    slippage: '1',
    wallet,
    buildBridgeTokenSideParams: jest.fn().mockReturnValue({}),
    feeRate: 0,
    maxNativeTokenGasPrice: undefined,
    rbiSource: 'test',
    builtBridgeTxsKeyRef: { current: '' },
    setQuotesList,
    isSameBridgeQuote,
    console: { error: jest.fn() },
  };
  const run = new Function(
    ...Object.keys(scope),
    `${compiled}; return buildTxs;`
  )(...Object.values(scope));
  return {
    run,
    reject,
    buildKey,
    requestId,
    wallet,
    setQuotesList,
    otherQuote,
    getQuotes: () => quotes,
    refresh: () => {
      const fresh = { ...oldQuote, quote_key: { quote_id: 'fresh' } };
      quotes = [fresh, otherQuote];
      return fresh;
    },
  };
}

describe('Bridge failed build quote cleanup', () => {
  it.each(['quote', 'wallet'] as const)(
    'preserves a refreshed quote when an old %s request fails',
    async (stage) => {
      const state = setup(stage);
      const pending = state.run('old');
      await Promise.resolve();
      const fresh = state.refresh();
      state.buildKey.current = 'fresh';
      state.reject(new Error('Old build failed'));
      await pending;
      expect(state.getQuotes()).toEqual([fresh, state.otherQuote]);
      if (stage === 'quote') {
        expect(state.wallet.buildBridgeToken).not.toHaveBeenCalled();
      }
    }
  );

  it('preserves quotes from a new request even when the build key is unchanged', async () => {
    const state = setup();
    const pending = state.run('old');
    const fresh = state.refresh();
    state.requestId.current += 1;
    state.reject(new Error('Previous quote request failed'));
    await pending;
    expect(state.getQuotes()).toEqual([fresh, state.otherQuote]);
  });

  it('still removes the current failed quote and preserves other routes', async () => {
    const state = setup();
    const pending = state.run('old');
    state.reject(new Error('Current build failed'));
    await pending;
    expect(state.getQuotes()).toEqual([state.otherQuote]);
    expect(state.wallet.buildBridgeToken).not.toHaveBeenCalled();
  });

  it('checks freshness when the state updater is applied', async () => {
    const state = setup();
    state.setQuotesList.mockImplementation(() => undefined);
    const pending = state.run('old');
    state.reject(new Error('Build failed'));
    await pending;
    const fresh = state.refresh();
    state.buildKey.current = 'fresh';
    const update = state.setQuotesList.mock.calls[0][0];
    expect(update(state.getQuotes())).toEqual([fresh, state.otherQuote]);
  });
});
