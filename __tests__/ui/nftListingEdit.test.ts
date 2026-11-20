import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';
import BigNumber from 'bignumber.js';
import { last, uniqBy } from 'lodash';

// Exercise the production listing callbacks without mounting the large asset UI.
const file =
  'src/ui/views/DesktopProfile/components/NFTTabPane/components/CreateListingModal.tsx';
const source = ts.createSourceFile(
  file,
  readFileSync(resolve(file), 'utf8'),
  ts.ScriptTarget.Latest,
  true
);
const callbacks: Record<string, string> = {};
const names = [
  'checkNeedCancelFirst',
  'buildTxs',
  'runFallback',
  'handleSignResult',
];
const visit = (node: ts.Node) => {
  if (
    ts.isVariableDeclaration(node) &&
    names.includes(node.name.getText(source)) &&
    node.initializer
  ) {
    const value = ts.isCallExpression(node.initializer)
      ? node.initializer.arguments[0]
      : node.initializer;
    callbacks[node.name.getText(source)] = value.getText(source);
  }
  ts.forEachChild(node, visit);
};
visit(source);
const load = (name: string, context: Record<string, any>) => {
  if (!callbacks[name]) throw new Error(`Missing callback ${name}`);
  return runInNewContext(
    ts.transpileModule(`(${callbacks[name]})`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context
  );
};

const original = {
  order_hash: 'old',
  protocol_data: { parameters: { salt: 'old' } },
};
const another = {
  order_hash: 'another',
  protocol_data: { parameters: { salt: 'another' } },
};
const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

describe('NFT listing edits invalidate old authority', () => {
  let context: Record<string, any>;
  let build: () => Promise<any>;

  beforeEach(() => {
    context = {
      BigNumber,
      uniqBy,
      last,
      BigInt,
      isEdit: true,
      currentOrder: { listingPrice: '9', amount: 1, creatorFeeEnable: false },
      formValues: {
        listingPrice: '10',
        amount: 1,
        creatorFeeEnable: false,
        duration: 3600000,
      },
      nftDetail: {
        inner_id: '1',
        contract_id: '0xnft',
        chain: 'eth',
        collection: { is_erc721: true },
      },
      fees: { marketplace_fees: [], custom_royalties: [] },
      feesRate: { totalBps: 0, isCustomRequired: false },
      chain: { id: 1 },
      currentAccount: { address: '0xowner' },
      listingToken: { id: 'eth', decimals: 18 },
      listingOrders: [original],
      refetchListingOrders: jest.fn(async () => ({ orders: [original] })),
      runCheckIsApproved: jest.fn(async () => true),
      OPENSEA_CONDUIT_ADDRESS: '0xconduit',
      getNFTTradingCurrency: () => ({ id: 'eth', decimals: 18 }),
      calcMinReceiveAmount: ({ gross }: { gross: bigint }) => gross,
      verifyCreateListingTypedData: jest.fn(),
      waitForTxCompleted: jest.fn(async () => undefined),
      wallet: {
        buildCancelNFTListTx: jest.fn(async () => ({ data: 'cancel' })),
        buildSetApprovedForAllTx: jest.fn(async () => ({ data: 'approve' })),
        buildCreateListingTypedData: jest.fn(async () => ({
          message: { salt: 'new' },
        })),
        sendRequest: jest.fn(async ({ method, params }) =>
          method === 'eth_sendTransaction'
            ? `${params[0].data}-hash`
            : 'signature'
        ),
        openapi: { createListingNFT: jest.fn() },
      },
    };
    context.checkNeedCancelFirst = load('checkNeedCancelFirst', context);
    build = load('buildTxs', context);
  });

  test.each([
    ['9', '10', true],
    ['2', '100', true],
    ['0.09', '0.1', true],
    ['1.000000000000000001', '1.000000000000000002', true],
    ['10', '9', false],
    ['2', '2.0', false],
    ['1', '1', false],
  ])(
    'compares price %s -> %s numerically (cancel: %s)',
    (oldPrice, newPrice, cancel) => {
      context.currentOrder.listingPrice = oldPrice;
      context.formValues.listingPrice = newPrice;
      expect(!!context.checkNeedCancelFirst()).toBe(cancel);
    }
  );

  test.each(['amount', 'creatorFeeEnable'])(
    'still cancels for a change in %s',
    (field) => {
      context.formValues.listingPrice = '9';
      context.formValues[field] = field === 'amount' ? 2 : true;
      expect(context.checkNeedCancelFirst()).toBe(true);
    }
  );

  test('cancels cached and refreshed orders once, before approval if it must be restored', async () => {
    context.runCheckIsApproved.mockResolvedValue(false);
    context.refetchListingOrders.mockResolvedValue({
      orders: [original, another],
    });
    const result = await build();
    expect(context.wallet.buildCancelNFTListTx).toHaveBeenCalledWith({
      address: '0xowner',
      chainId: 1,
      orders: [
        original.protocol_data.parameters,
        another.protocol_data.parameters,
      ],
    });
    expect(result.steps[0]).toEqual({
      kind: 'tx',
      txs: [{ data: 'cancel' }, { data: 'approve' }],
    });
    expect(result.steps[1].kind).toBe('typed');
    expect(context.wallet.buildCreateListingTypedData).toHaveBeenCalledWith(
      expect.objectContaining({ listingPriceInWei: '10000000000000000000' })
    );
  });

  test('still cancels a known order when it disappeared from the orderbook', async () => {
    context.refetchListingOrders.mockResolvedValue({ orders: [] });
    expect((await build()).steps[0].txs).toEqual([{ data: 'cancel' }]);
    expect(
      context.wallet.buildCancelNFTListTx.mock.calls[0][0].orders
    ).toEqual([original.protocol_data.parameters]);
  });

  test.each([
    'failed refresh',
    'missing response',
    'malformed response',
    'missing original',
    'empty order set',
  ])(
    'stops before granting approval or creating a replacement on %s',
    async (failure) => {
      context.runCheckIsApproved.mockResolvedValue(false);
      if (failure === 'failed refresh')
        context.refetchListingOrders.mockRejectedValue(new Error('offline'));
      if (failure === 'missing response')
        context.refetchListingOrders.mockResolvedValue(undefined);
      if (failure === 'malformed response')
        context.refetchListingOrders.mockResolvedValue({ orders: null });
      if (failure === 'missing original') context.currentOrder = undefined;
      if (failure === 'empty order set') {
        context.listingOrders = [];
        context.refetchListingOrders.mockResolvedValue({ orders: [] });
      }
      await expect(build()).rejects.toThrow();
      expect(context.wallet.buildSetApprovedForAllTx).not.toHaveBeenCalled();
      expect(context.wallet.buildCreateListingTypedData).not.toHaveBeenCalled();
    }
  );

  test.each([true, false])(
    'preserves new listings (already approved: %s)',
    async (approved) => {
      context.isEdit = false;
      context.currentOrder = undefined;
      context.runCheckIsApproved.mockResolvedValue(approved);
      const result = await build();
      expect(context.refetchListingOrders).not.toHaveBeenCalled();
      expect(context.wallet.buildCancelNFTListTx).not.toHaveBeenCalled();
      expect(result.steps.map((step: any) => step.kind)).toEqual(
        approved ? ['typed'] : ['tx', 'typed']
      );
    }
  );

  test('preserves price decreases without unnecessary cancellations', async () => {
    context.formValues.listingPrice = '8';
    const result = await build();
    expect(result.steps.map((step: any) => step.kind)).toEqual(['typed']);
    expect(context.refetchListingOrders).not.toHaveBeenCalled();
  });

  test.each([false, true])(
    'requires cancellation confirmation before restoring approval or signing (cancel fails: %s)',
    async (fails) => {
      context.runCheckIsApproved.mockResolvedValue(false);
      const built = await build();
      context.steps = built.steps;
      const confirmation = deferred();
      context.waitForTxCompleted.mockReturnValueOnce(confirmation.promise);
      const run = load('runFallback', context);
      const pending = run();
      for (let i = 0; i < 10; i++) await Promise.resolve();
      expect(context.wallet.sendRequest).toHaveBeenCalledTimes(1);
      expect(context.waitForTxCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ hash: 'cancel-hash' })
      );
      if (fails) {
        confirmation.reject(new Error('cancel reverted'));
        await expect(pending).rejects.toThrow('cancel reverted');
        expect(context.wallet.sendRequest).toHaveBeenCalledTimes(1);
        expect(context.wallet.openapi.createListingNFT).not.toHaveBeenCalled();
      } else {
        confirmation.resolve();
        const hashes = await pending;
        expect(hashes).toEqual(['cancel-hash', 'approve-hash', 'signature']);
        expect(
          context.waitForTxCompleted.mock.calls.map(([p]: any[]) => p.hash)
        ).toEqual(['cancel-hash', 'approve-hash']);
        await load('handleSignResult', context)({ hashes, txsInfo: built });
        expect(context.wallet.openapi.createListingNFT).toHaveBeenCalledWith({
          order: built.order,
          signature: 'signature',
          chain_id: 'eth',
        });
      }
    }
  );
});
