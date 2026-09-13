import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { ModuleKind, transpileModule } from 'typescript';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { getActionSecurityGate } from '@/ui/views/Approval/components/SecurityEngine/actionSecurity';

const defer = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const risk = (level = Level.DANGER) => ({ id: '1077', enable: true, level });
const response = (ids: string[]) => ({
  action:
    ids.length === 1
      ? { type: 'single', id: ids[0] }
      : { type: 'multi_actions', data: ids.map((id) => ({ id })) },
  log_id: 'log',
});

describe('SignTypedData security lifecycle', () => {
  let root: Root;
  const reactActEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  let Component: React.ComponentType<any>;
  let footer: any;
  let actions: any;
  let props: any;
  let rules: any[];
  let userData: object;
  let processedRules: string[];
  let wallet: any;
  let engine: jest.Mock;
  let approve: jest.Mock;
  let enterPassphrase: jest.Mock;
  let store: any;
  let requiredData: jest.Mock;
  let isTestnet: boolean;
  let buttons: Map<string, any>;
  let safeMessageSuccess: (result: any) => void;
  let showSafeModal: jest.Mock;
  let destroySafeModal: jest.Mock;
  const empty = () => null;
  const noop = () => undefined;
  const render = () => root.render(React.createElement(Component, props));
  const flush = async () => {
    await act(async () => {
      for (let index = 0; index < 25; index++) await Promise.resolve();
    });
  };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    root = createRoot(document.createElement('div'));
    rules = [];
    userData = {};
    processedRules = [];
    footer = undefined;
    actions = undefined;
    requiredData = jest.fn().mockResolvedValue({});
    isTestnet = false;
    buttons = new Map();
    destroySafeModal = jest.fn();
    showSafeModal = jest.fn(() => ({ destroy: destroySafeModal }));
    engine = jest.fn().mockResolvedValue([]);
    approve = jest.fn();
    enterPassphrase = jest.fn().mockResolvedValue(undefined);
    wallet = {
      getConnectedSite: jest.fn().mockResolvedValue(null),
      openapi: {
        parseCommon: jest.fn().mockResolvedValue(response(['a', 'b'])),
        postActionLog: jest.fn(),
      },
      reportStats: jest.fn().mockResolvedValue(undefined),
      ruleEnableStatusChange: jest.fn().mockResolvedValue(undefined),
      getApproval: jest.fn().mockResolvedValue({
        id: 'approval',
        data: { approvalComponent: 'SignTypedData' },
      }),
    };
    store = {
      init: jest.fn().mockResolvedValue(undefined),
      closeRuleDrawer: noop,
      processAllRules: (ids: string[]) => {
        processedRules = ids;
        render();
      },
      processRule: noop,
      unProcessRule: noop,
    };
    props = {
      approvalId: 'approval',
      account: { address: '0xaccount', type: 'HD', brandName: 'HD' },
      params: {
        method: 'eth_signTypedData_v4',
        data: [
          '0xaccount',
          JSON.stringify({
            domain: { chainId: 1 },
            types: {},
            message: {},
            primaryType: 'Test',
          }),
        ],
        session: { origin: 'https://dapp.test', icon: '', name: 'Dapp' },
      },
    };
    // Run the real component and React effects while replacing unrelated wallet
    // services and presentation components. This keeps its asynchronous state
    // transitions covered without loading the extension's entire UI bundle.
    const modules: Record<string, any> = {
      react: React,
      'react-use': {
        useAsyncRetry,
        useScroll: () => undefined,
      },
      'react-i18next': { useTranslation: () => ({ t: (key: string) => key }) },
      ahooks: {
        useSize: () => undefined,
        useDebounceFn: (fn: any) => ({ run: fn }),
      },
      antd: {
        Button: (value: any) => {
          buttons.set(value.children, value);
          return null;
        },
        Drawer: empty,
        Modal: { info: showSafeModal },
        Skeleton: { Input: empty },
      },
      lodash: { cloneDeep: (data: any) => JSON.parse(JSON.stringify(data)) },
      '@/background/utils': { underline2Camelcase: (value: string) => value },
      '@/utils/matomo-request': { matomoRequestEvent: noop },
      '@/utils/transaction': { getKRCategoryByType: (value: string) => value },
      consts: {
        ALIAS_ADDRESS: {},
        CHAINS: { ETH: { serverId: 'eth' } },
        INTERNAL_REQUEST_ORIGIN: 'internal',
        KEYRING_CLASS: { HARDWARE: { LEDGER: 'Ledger' } },
        KEYRING_TYPE: {
          HdKeyring: 'HD',
          GnosisKeyring: 'Safe',
          WatchAddressKeyring: 'Watch',
        },
        REJECT_SIGN_TEXT_KEYRINGS: [],
      },
      'ui/utils': {
        getTimeSpan: noop,
        useApproval: () => [noop, approve, noop],
        useCommonPopupView: () => ({ activeApprovalPopup: () => false }),
        useWallet: () => wallet,
      },
      './map': { WaitingSignMessageComponent: {} },
      './FooterBar/FooterBar': {
        FooterBar: (value: any) => {
          footer = value;
          return null;
        },
      },
      '@/ui/state/securityEngine': {
        SecurityEngineScopeProvider: ({ children }: any) => children,
        useSecurityEngineStore: Object.assign(
          () => ({
            ...store,
            rules,
            userData,
            currentTx: {
              processedRules,
              ruleDrawer: { selectRule: null, visible: false },
            },
          }),
          {
            getState: () => ({
              rules,
              userData,
              currentTx: { processedRules },
            }),
          }
        ),
      },
      './SignTypedDataExplain/parseSignTypedDataMessage': {
        parseSignTypedDataMessage: (data: any) =>
          typeof data === 'string' ? JSON.parse(data) : data,
      },
      'ui/utils/securityEngine': {
        useSecurityEngine: () => ({ executeEngine: engine }),
      },
      './SecurityEngine/RuleDrawer': {
        __esModule: true,
        default: empty,
      },
      './SecurityEngine/actionSecurity': { getActionSecurityGate },
      './TypedDataActions': {
        __esModule: true,
        default: (value: any) => {
          actions = value;
          return null;
        },
      },
      './TypedDataActions/utils': {
        cleanEIP712Payload: (data: any) => data,
        isDeepJSON: () => false,
        normalizeTypeData: (data: any) => data,
      },
      '@rabby-wallet/rabby-security-engine/dist/rules': {
        Level,
        defaultRules: [],
      },
      '@/utils/chain': {
        isTestnetChainId: () => isTestnet,
        findChain: () => undefined,
      },
      '@/ui/views/Dashboard/components/TokenDetailPopup': {
        TokenDetailPopup: empty,
      },
      '@/ui/state/sign': {
        useSignStore: (selector: any) =>
          selector({ tokenDetail: {}, closeTokenDetailPopup: noop }),
      },
      '@/ui/hooks/useEnterPassphraseModal': {
        useEnterPassphraseModal: () => enterPassphrase,
      },
      clsx: { __esModule: true, default: () => '' },
      '@/stats': { __esModule: true, default: { report: noop } },
      '@rabby-wallet/rabby-action': {
        parseAction: ({ data }: any) => ({ ...data }),
        formatSecurityEngineContext: async ({ actionData }: any) => ({
          id: actionData.id,
        }),
        fetchActionRequiredData: requiredData,
      },
      '../hooks/useGetCurrentSafeInfo': { useGetCurrentSafeInfo: () => ({}) },
      '../hooks/useGetCurrentMessageHash': { useGetMessageHash: () => ({}) },
      '../hooks/useCheckCurrentSafeMessage': {
        useCheckCurrentSafeMessage: (_args: any, options: any) => {
          safeMessageSuccess = options.onSuccess;
          return {};
        },
      },
      './TxComponents/GnosisDrawer': { __esModule: true, default: empty },
      '@safe-global/protocol-kit': { generateTypedData: noop },
      '@/utils/ga4': { ga4: { fireEvent: noop } },
      'ui/assets/walletlogo/safe.svg': '',
      '@/ui/state/exchange': { getCexInfo: async () => ({}) },
      '@/ui/utils/ledger-dmk': { requestLedgerHIDPermission: noop },
      './signMessageHighlighter': { tokenizeSignTypedDataMessage: () => [] },
      './signMessageOrigin': {
        addSignMessageOriginFallback: (value: any) => value,
      },
      './useSignMessageAddressData': { useSignMessageAddressData: () => ({}) },
    };
    const compiled = transpileModule(
      readFileSync(
        resolve(
          __dirname,
          '../../src/ui/views/Approval/components/SignTypedData.tsx'
        ),
        'utf8'
      ),
      {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          jsx: 2,
          esModuleInterop: true,
        },
      }
    ).outputText;
    const exports: any = {};
    runInNewContext(compiled, {
      exports,
      console: { ...console, error: noop },
      require: (name: string) => {
        if (!(name in modules))
          throw new Error(`Missing test dependency ${name}`);
        return modules[name];
      },
    });
    Component = exports.default;
  });

  afterEach(() => {
    act(() => root.unmount());
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  test('waits for every action and never lets another action SAFE erase a risk', async () => {
    const second = defer<any[]>();
    engine.mockImplementation(({ id }) =>
      id === 'a' ? Promise.resolve([risk(Level.SAFE)]) : second.promise
    );
    act(render);
    await flush();
    expect(footer.securityBlocked).toBe(true);
    await act(async () => {
      second.resolve([risk()]);
    });
    await flush();
    expect(actions.multiAction.engineResultList).toHaveLength(2);
    expect(footer.securityLevel).toBe(Level.DANGER);
    expect(footer.securityBlocked).toBe(true);
    act(() => footer.onIgnoreAllRules());
    expect(footer.securityBlocked).toBe(false);
    expect(processedRules).toHaveLength(1);
  });

  test('rule updates reevaluate all actions and ignore older completions', async () => {
    const old = defer<any[]>();
    engine.mockReturnValue(old.promise);
    act(render);
    await flush();
    expect(engine).toHaveBeenCalledTimes(2);
    engine.mockResolvedValue([risk()]);
    rules = [{ id: 'changed' }];
    act(render);
    expect(footer.securityBlocked).toBe(true);
    await flush();
    expect(engine).toHaveBeenCalledTimes(4);
    expect(footer.securityBlocked).toBe(true);
    await act(async () => {
      old.resolve([]);
    });
    await flush();
    expect(footer.securityLevel).toBe(Level.DANGER);
    expect(footer.securityBlocked).toBe(true);
  });

  test('request changes clear multi actions and a completed empty result permits the new single action', async () => {
    engine.mockResolvedValue([risk()]);
    act(render);
    await flush();
    expect(actions.multiAction).toBeDefined();
    wallet.openapi.parseCommon.mockResolvedValue(response(['single']));
    engine.mockResolvedValue([]);
    props = {
      ...props,
      params: {
        ...props.params,
        data: [
          '0xaccount',
          JSON.stringify({
            domain: {},
            types: {},
            message: { next: true },
            primaryType: 'Test',
          }),
        ],
      },
    };
    act(render);
    expect(footer.securityBlocked).toBe(true);
    await flush();
    expect(actions.multiAction).toBeUndefined();
    expect(actions.data.id).toBe('single');
    expect(footer.securityBlocked).toBe(false);
  });

  test('an enabled rule ERROR fails closed and cannot be ignored', async () => {
    engine.mockResolvedValue([risk(Level.ERROR)]);
    act(render);
    await flush();
    expect(footer.securityBlocked).toBe(true);
    act(() => footer.onIgnoreAllRules());
    await act(async () => {
      await footer.onSubmit();
    });
    expect(approve).not.toHaveBeenCalled();
    expect(processedRules).toEqual([]);
  });

  test('does not submit after security settings change during a passphrase wait', async () => {
    const passphrase = defer<void>();
    enterPassphrase.mockReturnValue(passphrase.promise);
    act(render);
    await flush();
    expect(footer.securityBlocked).toBe(false);
    let submission: Promise<void>;
    act(() => {
      submission = footer.onSubmit();
    });
    engine.mockResolvedValue([risk()]);
    userData = { updated: true };
    act(render);
    await flush();
    await act(async () => {
      passphrase.resolve();
      await submission;
    });
    expect(approve).not.toHaveBeenCalled();
  });

  test.each(['parse', 'required data'])(
    '%s failure blocks signing until a successful retry',
    async (failure) => {
      const failingRequest =
        failure === 'parse' ? wallet.openapi.parseCommon : requiredData;
      failingRequest.mockRejectedValueOnce(new Error('Request failed'));
      act(render);
      await flush();
      expect(footer.securityBlocked).toBe(true);
      expect(engine).not.toHaveBeenCalled();
      await act(async () => {
        await footer.onSubmit();
      });
      expect(approve).not.toHaveBeenCalled();

      const retry = buttons.get('global.refresh');
      expect(retry).toBeDefined();
      act(() => retry.onClick());
      await flush();
      expect(wallet.openapi.parseCommon).toHaveBeenCalledTimes(2);
      expect(actions.multiAction.engineResultList).toHaveLength(2);
      expect(footer.securityBlocked).toBe(false);
      await act(async () => {
        await footer.onSubmit();
      });
      expect(approve).toHaveBeenCalledWith({});
    }
  );

  test.each(['V1', 'testnet'])(
    '%s typed data preserves signing without a supported security parser',
    async (kind) => {
      if (kind === 'V1') {
        props.params = {
          ...props.params,
          method: 'eth_signTypedData',
          data: [
            [{ name: 'Message', type: 'string', value: 'Hello' }],
            '0xaccount',
          ],
        };
      } else {
        isTestnet = true;
      }
      act(render);
      await flush();
      expect(wallet.openapi.parseCommon).not.toHaveBeenCalled();
      expect(requiredData).not.toHaveBeenCalled();
      expect(engine).not.toHaveBeenCalled();
      expect(footer.securityBlocked).toBe(false);
      await act(async () => {
        await footer.onSubmit();
      });
      expect(approve).toHaveBeenCalledWith({});
    }
  );

  test('Safe completion waits for risk review and an old modal cannot confirm a replacement request', async () => {
    engine.mockResolvedValue([risk()]);
    act(render);
    await flush();
    act(() =>
      safeMessageSuccess({
        isFinished: true,
        safeMessage: { preparedSignature: 'signature' },
      })
    );
    expect(showSafeModal).not.toHaveBeenCalled();
    act(() => footer.onIgnoreAllRules());
    expect(showSafeModal).toHaveBeenCalledTimes(1);
    const modalButton =
      showSafeModal.mock.calls[0][0].content.props.children[1].props.children;
    props = {
      ...props,
      params: {
        ...props.params,
        data: [
          '0xaccount',
          JSON.stringify({
            domain: {},
            types: {},
            message: { changed: true },
            primaryType: 'Test',
          }),
        ],
      },
    };
    act(render);
    await flush();
    expect(destroySafeModal).toHaveBeenCalled();
    await act(async () => {
      await modalButton.props.onClick();
    });
    expect(approve).not.toHaveBeenCalled();
  });
});
