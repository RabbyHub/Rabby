import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import * as ahooks from 'ahooks';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { ModuleKind, transpileModule } from 'typescript';
import * as approvalHooks from '@/ui/utils/hooks';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import eventBus from '@/eventBus';

const mockWallet = {
  getApproval: jest.fn(),
  getCurrentAccount: jest.fn(),
  getSite: jest.fn(),
  sendRequest: jest.fn(),
  resolveApprovalFor: jest.fn(),
  rejectApprovalFor: jest.fn(),
};
const mockHistory = { replace: jest.fn(), push: jest.fn() };
const mockDeviceConnect = jest.fn();
let mockSetPopup: (visible: boolean) => void;
jest.mock('react-router-dom', () => ({ useHistory: () => mockHistory }));
jest.mock('@/ui/utils/WalletContext', () => ({ useWallet: () => mockWallet }));
jest.mock('@/constant', () => ({ KEYRING_CLASS: {}, KEYRING_TYPE: {} }));
jest.mock('@/ui/utils/ledger', () => ({}));
jest.mock('@/ui/utils/approval-popup', () => ({
  useApprovalPopup: () => ({
    showPopup: () => mockSetPopup(true),
    enablePopup: () => true,
  }),
}));
jest.mock('@/ui/utils/useDeviceConnect', () => ({
  useDeviceConnect: () => mockDeviceConnect,
}));
jest.mock('@/ui/store', () => ({}));
jest.mock('react-i18next', () => ({}));
jest.mock('@/ui/state/exchange', () => ({}));

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const empty = () => null;
const button = ({ children, onClick, loading }: any) =>
  React.createElement('button', { onClick, disabled: loading }, children);
const account = {
  address: '0xaccount',
  type: 'hardware',
  brandName: 'hardware',
};
const request = { action: {}, nonce: 1, typedData: {} };
const EVENTS = { APPROVAL_CREATED: 'APPROVAL_CREATED' };

describe('invitation-owned hardware signature', () => {
  let root: Root;
  let container: HTMLDivElement;
  let current: any;
  let signature = deferred<string>();
  let submission = deferred<boolean>();
  let submit: jest.Mock;
  let success: jest.Mock;
  let failure: jest.Mock;

  const flush = async () => {
    await act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
      jest.advanceTimersByTime(0);
    });
  };
  const click = async (label: string) => {
    const target = Array.from(container.querySelectorAll('button')).find(
      (element) => element.textContent === label
    );
    expect(target).toBeDefined();
    act(() => target!.click());
    await flush();
  };
  const announce = async (requestId: string, component = 'SignTypedData') => {
    act(() => {
      eventBus.emit(EVENTS.APPROVAL_CREATED, {
        requestId,
        approval: { id: 'signature', component },
      });
    });
    await flush();
  };
  const begin = async () => {
    await click('page.perps.invitePopup.activateNow');
    const [, options] = mockWallet.sendRequest.mock.calls[0];
    await announce(options.approvalRequestId);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(window, 'close').mockImplementation(() => undefined);
    container = document.createElement('div');
    root = createRoot(container);
    signature = deferred<string>();
    submission = deferred<boolean>();
    submit = jest.fn(() => submission.promise);
    success = jest.fn();
    failure = jest.fn();
    current = null;
    mockDeviceConnect.mockResolvedValue(true);
    mockWallet.getCurrentAccount.mockResolvedValue(account);
    mockWallet.getSite.mockResolvedValue({});
    mockWallet.getApproval.mockImplementation(async () => current);
    mockWallet.sendRequest.mockImplementation(() => {
      current = {
        id: 'signature',
        data: { approvalComponent: 'SignTypedData' },
      };
      return signature.promise;
    });
    mockWallet.resolveApprovalFor.mockImplementation(
      async ({ approval, data }) => {
        if (
          approval.id !== current?.id ||
          approval.component !== current?.data.approvalComponent
        )
          return { accepted: false };
        if (approval.component === 'SignTypedData') {
          current = {
            id: 'waiting',
            data: { approvalComponent: 'CommonWaiting', params: data },
          };
        } else {
          current = null;
          signature.resolve('signature-result');
        }
        return { accepted: true };
      }
    );
    mockWallet.rejectApprovalFor.mockImplementation(async () => {
      signature.reject(new Error('User rejected signing'));
      window.close();
      return { accepted: true };
    });
    const modules: Record<string, any> = {
      react: React,
      uuid: require('uuid'),
      ahooks,
      antd: { Button: button, message: { success, error: failure } },
      clsx: () => '',
      consts: {
        EVENTS,
        KEYRING_CLASS: { HARDWARE: { TREZOR: 'trezor' } },
        KEYRING_TYPE: {},
      },
      'react-i18next': { useTranslation: () => ({ t: (key: string) => key }) },
      'styled-components': {
        div: () => ({ children }: any) =>
          React.createElement('div', null, children),
      },
      'ui/utils': { ...approvalHooks, useWallet: () => mockWallet },
      'ui/component': { FallbackSiteLogo: empty },
      '@/eventBus': eventBus,
      '@/ui/hooks/useEventBusListener': { useEventBusListener },
      '@/ui/hooks/useMiniApprovalDirectSign': {
        supportedDirectSign: () => false,
      },
      '@/ui/store': { useRabbySelector: () => false },
      '@/ui/component/AccountSelector': { AccountSelector: empty },
      '@/ui/component/ThemeMode/ThemeIcon': empty,
      '@/ui/component/MiniSignV2': {},
      '@/ui/views/Perps/constants': { PERPS_REFERENCE_CODE: 'RABBY' },
      '@/ui/views/Perps/sdkManager': {
        getPerpsSDK: () => ({
          initAccount: empty,
          exchange: {
            prepareSetReferrer: () => request,
            sendSetReferrer: submit,
          },
        }),
      },
      '../map': { WaitingSignMessageComponent: { hardware: 'CommonWaiting' } },
    };
    const compiled = transpileModule(
      readFileSync(
        resolve(
          __dirname,
          '../../src/ui/views/Approval/components/Connect/PerpsInviteContent.tsx'
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
      window,
      console,
      setTimeout,
      require: (name: string) => {
        if (/^(?:@\/)?ui\/assets\//.test(name))
          return { ReactComponent: empty, RcIconSuccessCC: empty };
        if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
        return modules[name];
      },
    });
    // Device UI is stubbed; the approval hook and invitation/useRequest are real.
    const Waiting = () => {
      const [, resolveApproval, rejectApproval] = approvalHooks.useApproval({
        approvalId: 'waiting',
        approvalComponent: 'CommonWaiting',
      });
      return React.createElement(
        React.Fragment,
        null,
        button({
          children: 'Finish',
          onClick: () =>
            resolveApproval(
              'signature-result',
              current.data.params.stay
            ).then(() => mockSetPopup(false)),
        }),
        button({
          children: 'Cancel signing',
          onClick: () => rejectApproval('user cancel'),
        })
      );
    };
    const Host = () => {
      const [visible, setVisible] = useState(false);
      mockSetPopup = setVisible;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(exports.PerpsInviteContent, {
          approvalId: 'old-connect',
          params: { origin: 'https://app.hyperliquid.xyz', icon: '' },
        }),
        visible && React.createElement(Waiting)
      );
    };
    act(() => root.render(React.createElement(Host)));
    await flush();
  });

  afterEach(() => {
    act(() => root.unmount());
    jest.restoreAllMocks();
    jest.useRealTimers();
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  });

  test.each([true, false])(
    'waiting preserves invitation feedback (API success=%s)',
    async (ok) => {
      await begin();
      expect(mockWallet.resolveApprovalFor).toHaveBeenCalledWith(
        expect.objectContaining({
          approval: { id: 'signature', component: 'SignTypedData' },
        })
      );
      await click('Finish');
      expect(submit).toHaveBeenCalledWith({
        action: request.action,
        nonce: 1,
        signature: 'signature-result',
      });
      expect(mockHistory.replace).not.toHaveBeenCalled();
      await act(async () => {
        if (ok) submission.resolve(true);
        else submission.reject(new Error('Activation failed'));
      });
      await flush();
      expect(ok ? success : failure).toHaveBeenCalledTimes(1);
    }
  );

  test('ignores another request or component and can retry device connection without a second request', async () => {
    await click('page.perps.invitePopup.activateNow');
    const [, options] = mockWallet.sendRequest.mock.calls[0];
    await announce('other-request');
    await announce(options.approvalRequestId, 'Connect');
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
    mockDeviceConnect.mockResolvedValueOnce(false);
    await announce(options.approvalRequestId);
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
    await click('page.perps.invitePopup.activateNow');
    expect(mockWallet.sendRequest).toHaveBeenCalledTimes(1);
    expect(current.data.approvalComponent).toBe('CommonWaiting');
  });

  test('cancel still rejects the waiting approval with normal notification-close semantics', async () => {
    await begin();
    await click('Cancel signing');
    expect(mockWallet.rejectApprovalFor).toHaveBeenCalledWith({
      approval: { id: 'waiting', component: 'CommonWaiting' },
      error: 'user cancel',
      stay: false,
      isInternal: false,
    });
    expect(window.close).toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  test('an approval arriving after the invitation unmounts cannot start signing', async () => {
    await click('page.perps.invitePopup.activateNow');
    const [, options] = mockWallet.sendRequest.mock.calls[0];
    act(() => root.render(null));
    await announce(options.approvalRequestId);
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
    await act(async () => signature.reject(new Error('Window closed')));
    expect(submit).not.toHaveBeenCalled();
  });
});
