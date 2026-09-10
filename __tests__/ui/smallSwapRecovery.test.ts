import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';

// Execute the production submission catch: Stop preserves the in-flight row's
// outcome but must not pause/requeue the completed batch before React unmounts.
const source = readFileSync(
  resolve(
    __dirname,
    '../../src/ui/views/DesktopSmallSwap/hooks/useBatchSwapTask.ts'
  ),
  'utf8'
);
const ast = ts.createSourceFile(
  'useBatchSwapTask.ts',
  source,
  ts.ScriptTarget.Latest,
  true
);
let handler = '';
const visit = (node: ts.Node) => {
  if (
    ts.isCatchClause(node) &&
    node.block.getText(ast).includes("console.log('batch swap task error', e)")
  ) {
    handler = node.block.getText(ast).slice(1, -1);
  }
  ts.forEachChild(node, visit);
};
visit(ast);
if (!handler) throw new Error('Missing production swap error handler');
const handle = new Function(
  'e',
  'TASK_CANCELLED_ERROR_NAME',
  'isTaskCancelled',
  'statusRef',
  'onErrorRef',
  'setStatusDict',
  'item',
  't',
  'console',
  ts.transpileModule(handler, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText
);

test.each(['active', 'paused', 'completed', 'idle'])(
  'handles late swap errors while %s',
  (status) => {
    const recover = jest.fn();
    const update = jest.fn();
    handle(
      new Error('0x5515'),
      'TaskCancelled',
      () => false,
      { current: status },
      { current: recover },
      update,
      { id: 'token' },
      (s) => s,
      { log: jest.fn(), error: jest.fn() }
    );
    expect(recover).toHaveBeenCalledTimes(
      status === 'active' || status === 'paused' ? 1 : 0
    );
    expect(update).toHaveBeenCalledTimes(1);
  }
);
