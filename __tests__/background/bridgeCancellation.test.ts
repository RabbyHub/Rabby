import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';

// 提取真实方法，避免启动全部后台服务和弹窗。
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
    if (
      ts.isVariableDeclaration(node) &&
      names.includes(node.name.getText(source)) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      blocks[node.name.getText(source)] = node.initializer.arguments[0].getText(
        source
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  names.forEach((name) => {
    if (!blocks[name]) throw new Error(`Missing ${name}`);
  });
  return blocks;
};
const evaluate = (code: string, context: Record<string, unknown>) =>
  runInNewContext(
    ts.transpileModule(code, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context
  );
const methods = extract('src/background/service/transactionHistory.ts', [
  'completeRecentTxHistory',
  'completeBridgeTxHistory',
]);
const callbacks = extract('src/ui/views/Bridge/Component/PendingTxItem.tsx', [
  'applyHistoryList',
  'fetchRefreshLocalData',
]);
const original = () => ({
  address: '0xuser',
  fromChainId: 1,
  hash: '0xoriginal',
  status: 'pending',
});
const createService = () => {
  const store = {
    bridgeTxHistory: [original()],
    swapTxHistory: [],
    sendTxHistory: [],
    sendNftTxHistory: [],
    approveSwapTxHistory: [],
    approveBridgeTxHistory: [],
  };
  const service = evaluate(
    `new (class { store = store; ${Object.values(methods).join('\n')} })()`,
    {
      store,
      eventBus: { emit: jest.fn() },
      EVENTS: {
        broadcastToUI: 'broadcast',
        INNER_HISTORY_ITEM_COMPLETE: 'complete',
      },
    }
  );
  return { service, store };
};

it('marks a confirmed cancellation as source failure, including nonce 0x0', () => {
  const { service, store } = createService();
  const cancelled = {
    hash: '0xcancel',
    action: { actionData: { cancelTx: { nonce: '0x0' } } },
  };
  service.completeRecentTxHistory(
    [{ hash: '0xoriginal' }, cancelled],
    1,
    'success',
    cancelled
  );
  expect(store.bridgeTxHistory[0]).toMatchObject({
    status: 'fromFailed',
    acceleratedHash: '0xcancel',
    isCanceled: true,
  });
  const record = store.bridgeTxHistory[0];
  service.completeBridgeTxHistory('0xcancel', 1, 'allSuccess', {
    to_actual_token: { id: 'eth' },
    actual: { receive_token_amount: 1 },
  });
  expect(store.bridgeTxHistory[0]).toBe(record);
});

it('keeps an accelerated success as source success', () => {
  const { service, store } = createService();
  const accelerated = { hash: '0xfaster' };
  service.completeRecentTxHistory(
    [{ hash: '0xoriginal' }, accelerated],
    1,
    'success',
    accelerated
  );
  expect(store.bridgeTxHistory[0]).toMatchObject({
    status: 'fromSuccess',
    acceleratedHash: '0xfaster',
    isCanceled: false,
  });
});

it('does not treat the original winner as cancelled when a cancellation was also submitted', () => {
  const { service, store } = createService();
  const completed = { hash: '0xoriginal' };
  service.completeRecentTxHistory(
    [
      completed,
      {
        hash: '0xcancel',
        action: { actionData: { cancelTx: { nonce: '0x1' } } },
      },
    ],
    1,
    'success',
    completed
  );
  expect(store.bridgeTxHistory[0]).toMatchObject({
    status: 'fromSuccess',
    isCanceled: false,
  });
});

it('ignores a late remote result when the latest local record is cancelled', async () => {
  const local = original();
  const cancelled = {
    ...local,
    status: 'fromFailed',
    acceleratedHash: '0xcancel',
    isCanceled: true,
  };
  const wallet = {
    getRecentTxHistory: jest.fn().mockResolvedValue(cancelled),
    completeBridgeTxHistory: jest.fn(),
  };
  const setData = jest.fn();
  const resolveBridgePendingFromHistoryList = jest.fn();
  const apply = evaluate(`(${callbacks.applyHistoryList})`, {
    wallet,
    setData,
    resolveBridgePendingFromHistoryList,
  });
  await apply(local, [{ status: 'completed' }]);
  expect(setData).toHaveBeenCalledWith(cancelled);
  expect(resolveBridgePendingFromHistoryList).not.toHaveBeenCalled();
  expect(wallet.completeBridgeTxHistory).not.toHaveBeenCalled();
});

it('continues reading local cancellation after the UI has entered fromSuccess', async () => {
  const cancelled = { ...original(), status: 'fromFailed', isCanceled: true };
  const wallet = { getRecentTxHistory: jest.fn().mockResolvedValue(cancelled) };
  const refresh = evaluate(`(${callbacks.fetchRefreshLocalData})`, { wallet });
  await expect(
    refresh({ ...original(), status: 'fromSuccess' })
  ).resolves.toEqual(cancelled);
  wallet.getRecentTxHistory.mockResolvedValue({
    ...original(),
    status: 'pending',
  });
  await expect(
    refresh({ ...original(), status: 'fromSuccess' })
  ).resolves.toBeUndefined();
});
