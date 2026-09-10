// Run from the repository root: node __tests__/fixtures/miniPrefetchRepro.cjs
// Loads the real SignatureManager and reducer. Preparation/signing dependencies
// are mocked; no hardware, network or UI is used.
const fs = require('fs');
const cp = require('child_process');
const taskRequire = require('module').createRequire(
  process.cwd() + '/package.json'
);
const ts = taskRequire('typescript');

function loadCode(source, deps) {
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)((name) => {
    if (name in deps) return deps[name];
    throw new Error('Unmocked dependency: ' + name);
  }, exports);
  return exports;
}

(async () => {
  for (const ref of ['WORKTREE']) {
    const read = (file) =>
      ref === 'WORKTREE'
        ? fs.readFileSync(file, 'utf8')
        : cp.execFileSync('git', ['show', ref + ':' + file], {
            encoding: 'utf8',
          });
    const machine = loadCode(
      read('src/ui/component/MiniSignV2/state/machine.ts'),
      {}
    );
    let ready;
    let sends = 0;
    const prepare = new Promise((resolve) => {
      ready = resolve;
    });
    const constants = {
      CHAINS_ENUM: { ETH: 'ETH' },
      KEYRING_CLASS: { HARDWARE: { LEDGER: 'Ledger' } },
      KEYRING_TYPE: { HdKeyring: 'HD' },
    };
    const mod = loadCode(
      read('src/ui/component/MiniSignV2/state/SignatureManager.ts'),
      {
        './machine': machine,
        '@/ui/utils': { hasConnectedLedgerDevice: async () => true },
        '@/ui/component/MiniSignV2/services': {
          signatureService: {
            fingerprint: () => 'same-tx',
            prepare: () => prepare,
            send: async () => {
              sends++;
              return [{ txHash: '0xhash' }];
            },
          },
          SignatureSteps: {},
        },
        '@/constant': constants,
        '@/eventBus': { default: { emit: () => undefined } },
        '@/utils/chain': { findChain: () => ({ enum: 'ETH' }) },
        i18next: { t: (key) => key },
        'bignumber.js': taskRequire('bignumber.js'),
      }
    );
    const instance = new mod.SignatureManager();
    const request = {
      txs: [{ chainId: 1 }],
      config: { account: { type: 'Private Key', address: '0xowner' } },
    };
    const prefetch = instance.prefetch(request, {});
    const direct = instance.openDirect(request, {}).then(
      (value) => ({ success: value }),
      (error) => ({ error })
    );
    const skeleton = instance.getState().ctx;
    ready({
      ...skeleton,
      txsCalc: [{ preExecResult: { pre_exec: { success: true } } }],
      disabledProcess: false,
    });
    await prefetch;
    const result = await direct;
    require('assert/strict').deepEqual(result, { success: ['0xhash'] });
    require('assert/strict').equal(sends, 1);
    console.log(
      JSON.stringify({
        ref,
        result,
        sends,
        status: instance.getState().status,
        txsCalc: instance.getState().ctx?.txsCalc.length,
      })
    );
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
