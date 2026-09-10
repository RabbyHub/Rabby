// Run from the repository root: node __tests__/fixtures/signingSessionRepro.cjs
// Add --baseline to also demonstrate the original origin/develop behavior.
// Extracts the real ProviderController.ethSendTransaction body from TypeScript.
// Hardware signing, RPC/network and other services are mocked. This proves the
// continuation reaches/stops before broadcasting after a modeled boundary.
// Also uses the real session guard and default-RPC fanout helper. Device,
// network, and session-boundary triggers are mocked; this is not a physical
// device or real-network reproduction.
const fs = require('fs');
const cp = require('child_process');
const taskRequire = require('module').createRequire(
  process.cwd() + '/package.json'
);
const ts = taskRequire('typescript');
const assert = require('assert/strict');
const file = 'src/background/controller/provider/controller.ts';
const keyringTypes = {
  GnosisKeyring: 'gnosis',
  CoboArgusKeyring: 'cobo',
  WalletConnectKeyring: 'WalletConnect',
  CoinbaseKeyring: 'Coinbase',
};
const broadcastHash = '0x' + '11'.repeat(32);

function initializer(source, memberName = 'ethSendTransaction') {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  let value;
  function visit(n) {
    if (ts.isPropertyDeclaration(n) && n.name.getText(ast) === memberName) {
      value = n.initializer.getText(ast);
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
  if (!value) throw new Error('missing source method');
  return ts.transpileModule('const method = ' + value, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
}

function readAt(ref, path) {
  return ref === 'WORKTREE'
    ? fs.readFileSync(path, 'utf8')
    : cp.execFileSync('git', ['show', ref + ':' + path], { encoding: 'utf8' });
}

function loadSession() {
  const source = fs.readFileSync(
    'src/background/service/signingSession.ts',
    'utf8'
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(
    (name) =>
      name === '@/constant'
        ? { KEYRING_TYPE: keyringTypes }
        : taskRequire(name),
    exports
  );
  return exports;
}

function rpcFanout(ref, service) {
  const source = readAt(ref, 'src/background/service/rpc.ts');
  const ast = ts.createSourceFile(
    'rpc.ts',
    source,
    ts.ScriptTarget.Latest,
    true
  );
  const helper = ast.statements
    .find(
      (n) =>
        ts.isFunctionDeclaration(n) &&
        n.name.text === 'submitTxWithFallbackRpcs'
    )
    .getText(ast);
  const helperCode = ts.transpileModule(helper, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function(
    helperCode +
      initializer(source, 'defaultRPCSubmitTxWithFallback') +
      '; return method;'
  ).call(service);
}

(async () => {
  for (const ref of process.argv.includes('--baseline')
    ? ['origin/develop', 'WORKTREE']
    : ['WORKTREE']) {
    const source = readAt(ref, file);
    const code = initializer(source);
    const cases = [
      { name: 'active', boundary: 'none' },
      ...['lock', 'lock-unlock', 'A-B', 'A-B-A', 'abort'].map((boundary) => ({
        name: boundary,
        boundary,
      })),
      {
        name: 'FE-failure-active',
        boundary: 'none',
        phase: 'rpc',
        rpcFails: true,
      },
      {
        name: 'FE-failure-lock-unlock',
        boundary: 'lock-unlock',
        phase: 'rpc',
        rpcFails: true,
      },
      {
        name: 'FE-failure-abort',
        boundary: 'abort',
        phase: 'rpc',
        rpcFails: true,
      },
      {
        name: 'FE-success-lock',
        boundary: 'lock',
        phase: 'rpc',
        rpcFails: false,
      },
      { name: 'Cobo-delegate-restore', boundary: 'none', cobo: true },
      {
        name: 'WalletConnect-late-hash',
        boundary: 'lock',
        keyringType: 'WalletConnect',
        signedValue: broadcastHash,
        remoteHash: true,
      },
      {
        name: 'Coinbase-late-hash',
        boundary: 'lock',
        keyringType: 'Coinbase',
        signedValue: broadcastHash,
        remoteHash: true,
      },
      {
        name: 'hardware-string-no-bypass',
        boundary: 'lock',
        signedValue: broadcastHash,
      },
    ];
    for (const scenario of cases) {
      const { boundary } = scenario;
      const session = loadSession();
      const abort = new AbortController();
      const trace = [];
      let release, started;
      const pendingSign = new Promise((resolve) => {
        release = resolve;
      });
      const signingStarted = new Promise((resolve) => {
        started = resolve;
      });
      let releaseRpc, failRpc, startedRpc;
      const pendingRpc = new Promise((resolve, reject) => {
        releaseRpc = resolve;
        failRpc = reject;
      });
      const rpcStarted = new Promise((resolve) => {
        startedRpc = resolve;
      });
      let unlocked = true,
        account = 'A';
      let historyCount = 0;
      const signingRecord = { rawTx: { nonce: '0x0' } };
      let records = [signingRecord];
      const noop = () => undefined;
      const keyring = { type: scenario.keyringType || 'OneKey Hardware' };
      const chain = { id: 1, enum: 'ETH', serverId: 'eth', isTestnet: false };
      const history = {
        getSigningTx: () => records[0],
        updateSigningTx: noop,
        removeSigningTx: () => {
          records = [];
        },
        postCacheHistoryData: noop,
        addTx: () => {
          historyCount++;
        },
      };
      const rpcService = {
        store: {
          defaultRPC: {
            eth: { rpcUrl: ['https://rpc1.invalid', 'https://rpc2.invalid'] },
          },
        },
        probeBestRPC: noop,
        hasCustomRPC: () => scenario.phase !== 'rpc',
        getDefaultRPC: () => ({ txPushToRPC: true }),
        getDefaultRPCByChainServerId: () => ({
          rpcUrl: ['https://rpc1.invalid'],
        }),
        requestCustomRPC: async (...args) => {
          trace.push({ sink: args[1], unlocked, account });
          return '0xhash';
        },
        defaultRPCRequest: async (host, method) => {
          trace.push({ sink: method, host, unlocked, account });
          startedRpc();
          return pendingRpc;
        },
      };
      rpcService.defaultRPCSubmitTxWithFallback = rpcFanout(ref, rpcService);
      const env = {
        console: { log: noop, error: noop },
        createSigningSessionGuard: session.createSigningSessionGuard,
        isBroadcastTransactionHash: session.isBroadcastTransactionHash,
        assertProviderRequest: noop,
        cloneDeep: taskRequire('lodash/cloneDeep'),
        is1559Tx: () => false,
        is7702Tx: () => false,
        findChain: () => chain,
        findChainByEnum: () => chain,
        shouldUseTempoTransaction: () => false,
        isSimpleOrHdKeyringType: () => false,
        INTERNAL_REQUEST_ORIGIN: 'internal',
        Common: { custom: () => ({}) },
        Hardfork: { Prague: 'prague' },
        TransactionFactory: {
          fromTxData: () => ({ serialize: () => Uint8Array.of(1) }),
        },
        KEYRING_TYPE: keyringTypes,
        KEYRING_CLASS: {
          WALLETCONNECT: 'WalletConnect',
          HARDWARE: { GRIDPLUS: 'GridPlus' },
        },
        permissionService: { isInternalOrigin: () => true },
        transactionHistoryService: history,
        RPCService: rpcService,
        KEYRING_CATEGORY_MAP: { 'OneKey Hardware': 'Hardware' },
        keyringService: {
          isUnlocked: () => unlocked,
        },
        withSigningDiagnostics: async (_keyring, _operation, run) =>
          run({ setStage: noop }),
        withWalletConnectStatusRejection: (_keyring, _address, run) => run(),
        takeSigningCarrier: noop,
        getSigningContext: noop,
        fixKeyringAccountOnSigned: async () => undefined,
        addHexPrefix: (value) => '0x' + value,
        convertToHex: (value) => '0x' + value,
        bytesToHex: () => '0x01',
        eventBus: { emit: noop },
        EVENTS: {
          broadcastToUI: 'ui',
          TX_SUBMITTING: 'submitting',
          COMMON_HARDWARE: { REJECTED: 'rejected' },
        },
        validateGasPriceRange: noop,
        swapService: { postSwap: noop },
        bridgeService: { postBridge: noop },
        getTxMatchData: () => 'tx',
        transactionWatchService: { addTx: noop },
        notificationService: { setStatsData: noop },
        stats: { report: noop },
        openapiService: {
          submitTxV2: async () => {
            trace.push({ sink: 'backend', unlocked, account });
            return { tx_id: '0xbackend' };
          },
        },
        preferenceService: {
          getCurrentAccount: () => ({ address: account }),
          resetCurrentCoboSafeAddress: () => {
            account = 'Cobo';
            session.invalidateSigningSession();
            trace.push('Cobo restored');
          },
        },
      };
      const wrapperCode = initializer(
        readAt(ref, 'src/background/service/keyring/index.ts'),
        'signWithPairingCredsPersistence'
      );
      const wrapper = new Function(
        'env',
        'with(env){' + wrapperCode + '; return method;}'
      ).call(env.keyringService, env);
      env.keyringService.signTransaction = () =>
        wrapper(
          keyring,
          'transaction',
          () => {
            trace.push('sign pending');
            started();
            return pendingSign;
          },
          'A'
        );
      history.addSubmitFailedTransaction = noop;
      if (scenario.cobo) {
        account = 'Cobo';
        session.invalidateSigningSession();
        account = 'A';
        session.invalidateSigningSession();
      }
      const context = { _checkAddress: async () => keyring };
      const method = new Function(
        'env',
        'with(env){' + code + '; return method;}'
      ).call(context, env);
      const result = method({
        data: { params: [{ from: 'A', isCoboSafe: scenario.cobo }] },
        session: { origin: 'internal' },
        approvalRes: {
          chainId: 1,
          gas: '0x5208',
          gasPrice: '0x1',
          nonce: '0x0',
          signingTxId: 'record',
        },
        account: { address: 'A', type: keyring.type, brandName: keyring.type },
        pushed: false,
        signingSignal: abort.signal,
      }).then(
        (hash) => ({ hash }),
        (error) => ({ error: error?.message || String(error) })
      );
      await signingStarted;
      const signed = scenario.signedValue || { r: '01', s: '02', v: '1b' };
      if (scenario.phase === 'rpc') {
        release(signed);
        await rpcStarted;
      }
      if (boundary.startsWith('lock')) {
        unlocked = false;
        session.invalidateSigningSession();
      }
      if (boundary.startsWith('A-B')) {
        account = 'B';
        session.invalidateSigningSession();
      }
      if (boundary === 'abort') abort.abort();
      if (boundary !== 'none') records = [];
      trace.push(boundary);
      if (boundary === 'lock-unlock') {
        unlocked = true;
        session.invalidateSigningSession();
      }
      if (boundary === 'A-B-A') {
        account = 'A';
        session.invalidateSigningSession();
      }
      if (scenario.phase === 'rpc') {
        if (scenario.rpcFails) failRpc(new Error('Frontend RPC failure'));
        else releaseRpc('0xhash');
      } else release(signed);
      const outcome = await result;
      const broadcasts = trace.filter((x) => x && x.sink);
      const shouldBlock =
        ref === 'WORKTREE' &&
        boundary !== 'none' &&
        !(scenario.phase === 'rpc' && !scenario.rpcFails) &&
        !scenario.remoteHash;
      if (shouldBlock) {
        assert.match(
          outcome.error || '',
          /Signing request is no longer active/
        );
        assert.equal(broadcasts.length, scenario.phase === 'rpc' ? 2 : 0);
        assert.equal(broadcasts.filter((x) => x.sink === 'backend').length, 0);
      } else {
        assert.equal(
          outcome.hash,
          scenario.signedValue ||
            (scenario.phase === 'rpc' && scenario.rpcFails
              ? '0xbackend'
              : '0xhash')
        );
        assert.equal(historyCount, 1);
        const backendSuppressed = ref === 'WORKTREE' && boundary !== 'none';
        assert.equal(
          broadcasts.length,
          scenario.signedValue
            ? 0
            : scenario.phase === 'rpc'
            ? backendSuppressed
              ? 2
              : 3
            : 1
        );
      }
      if (scenario.cobo) assert.equal(account, 'Cobo');
      console.log(
        JSON.stringify({
          ref,
          scenario: scenario.name,
          outcome,
          broadcasts: broadcasts.length,
          historyCount,
        })
      );
    }

    // Message paths must capture the guard before account lookup, and must
    // check it again before returning a signature. They do not broadcast.
    for (const methodName of ['personalSign', '_signTypedData']) {
      const messageCode = initializer(source, methodName);
      for (const phase of ['lookup', 'signer']) {
        for (const boundary of ['none', 'abort', 'A-B-A']) {
          const session = loadSession();
          const abort = new AbortController();
          let resolveLookup, resolveSignature, startedSign;
          const lookup = new Promise((resolve) => {
            resolveLookup = resolve;
          });
          const signature = new Promise((resolve) => {
            resolveSignature = resolve;
          });
          const signingStarted = new Promise((resolve) => {
            startedSign = resolve;
          });
          let signatures = 0,
            historyCount = 0;
          const noop = () => undefined;
          const sign = () => {
            signatures++;
            startedSign();
            return signature;
          };
          const env = {
            assertProviderRequest: noop,
            createSigningSessionGuard: session.createSigningSessionGuard,
            keyringService: {
              isUnlocked: () => true,
              signPersonalMessage: sign,
              signTypedMessage: sign,
            },
            KEYRING_TYPE: keyringTypes,
            isString: (value) => typeof value === 'string',
            isHexString: () => true,
            stringToHex: (value) => value,
            signTextHistoryService: {
              createHistory: () => {
                historyCount++;
              },
            },
            reportSignText: noop,
          };
          const context = {
            _checkAddress: () =>
              phase === 'lookup' ? lookup : Promise.resolve({}),
          };
          const method = new Function(
            'env',
            'with(env){' + messageCode + '; return method;}'
          ).call(context, env);
          const req = {
            data: { params: ['0x1234', 'A'] },
            approvalRes: {},
            account: { address: 'A', type: 'OneKey Hardware' },
            session: { origin: 'internal' },
            signingSignal: abort.signal,
          };
          const pending = (methodName === 'personalSign'
            ? method(req)
            : method({ from: 'A', data: {}, version: 'V4', extra: {} }, req)
          ).then(
            (result) => ({ result }),
            (error) => ({ error: error?.message || String(error) })
          );
          if (phase === 'signer') await signingStarted;
          if (boundary === 'abort') abort.abort();
          if (boundary === 'A-B-A') {
            session.invalidateSigningSession();
            session.invalidateSigningSession();
          }
          resolveLookup({});
          resolveSignature('0xsignature');
          const outcome = await pending;
          if (ref === 'WORKTREE' && boundary !== 'none') {
            assert.match(
              outcome.error || '',
              /Signing request is no longer active/
            );
            assert.equal(signatures, phase === 'lookup' ? 0 : 1);
            assert.equal(historyCount, 0);
          } else {
            assert.equal(outcome.result, '0xsignature');
            assert.equal(signatures, 1);
          }
          console.log(
            JSON.stringify({
              ref,
              scenario: methodName + '-' + phase + '-' + boundary,
              outcome,
              signatures,
              historyCount,
            })
          );
        }
      }
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
