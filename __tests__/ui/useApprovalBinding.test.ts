const mockWallet = {
  getApproval: jest.fn(),
  resolveApproval: jest.fn(),
  rejectApproval: jest.fn(),
  coboSafeResetCurrentAccount: jest.fn(),
};

const historyPush = jest.fn();
const historyReplace = jest.fn();

jest.mock('@/ui/utils/WalletContext', () => ({
  useWallet: () => mockWallet,
  useCommonPopupView: () => ({
    activePopup: jest.fn(),
    setAccount: jest.fn(),
    approvalBinding: null,
  }),
}));

jest.mock('@/ui/utils/useDeviceConnect', () => ({
  useDeviceConnect: () => async () => true,
}));

jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: historyPush, replace: historyReplace }),
}));

jest.mock('@/ui/store', () => ({
  useRabbyDispatch: () => ({}),
  useRabbySelector: () => ({}),
}));

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('@/ui/state/exchange', () => ({ useExchangeStore: () => [] }));

// .tsx files are outside this project's jest transform, so stub the two the
// hook only needs at module load
jest.mock('@/ui/utils/approval-popup', () => ({
  useApprovalPopup: () => ({ showPopup: jest.fn(), enablePopup: () => false }),
}));

jest.mock('@/ui/utils/ledger', () => ({
  LedgerHDPathType: {},
  LedgerHDPathTypeLabel: {},
}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useApproval } from '@/ui/utils/hooks';
import {
  ApprovalBindingContext,
  ApprovalBinding,
} from '@/ui/utils/approval-context';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

type Actions = {
  resolve: ReturnType<typeof useApproval>[1];
  reject: ReturnType<typeof useApproval>[2];
};

const approval = (id: string, component = 'SignTx') =>
  ({ id, data: { approvalComponent: component } } as any);

const mount = (binding: ApprovalBinding | null) => {
  const actions = {} as Actions;
  const Harness = () => {
    const [, resolve, reject] = useApproval();
    actions.resolve = resolve;
    actions.reject = reject;
    return null;
  };

  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root;

  act(() => {
    root = createRoot(container);
    root.render(
      React.createElement(
        ApprovalBindingContext.Provider,
        { value: binding },
        React.createElement(Harness)
      )
    );
  });

  return {
    actions,
    unmount: () => act(() => root.unmount()),
  };
};

const binding: ApprovalBinding = { id: 'a', component: 'SignTx' } as any;

describe('useApproval binds actions to the page it was mounted for', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWallet.getApproval.mockResolvedValue(approval('a'));
  });

  it('names the bound approval when the caller passes no id', async () => {
    const { actions, unmount } = mount(binding);

    await act(async () => {
      await actions.reject('user cancel');
    });

    expect(mockWallet.rejectApproval).toHaveBeenCalledWith(
      'user cancel',
      false,
      false,
      'a'
    );

    await act(async () => {
      await actions.resolve({ signed: true });
    });

    expect(mockWallet.resolveApproval).toHaveBeenCalledWith(
      { signed: true },
      false,
      'a'
    );

    unmount();
  });

  it('does not touch the approval that replaced the bound one', async () => {
    mockWallet.getApproval.mockResolvedValue(approval('b'));
    const { actions, unmount } = mount(binding);

    await act(async () => {
      await actions.reject('user cancel');
      await actions.resolve({ signed: true });
    });

    expect(mockWallet.rejectApproval).not.toHaveBeenCalled();
    expect(mockWallet.resolveApproval).not.toHaveBeenCalled();

    unmount();
  });

  it('fails closed outside a binding when the caller names nothing', async () => {
    const { actions, unmount } = mount(null);

    await act(async () => {
      await actions.reject('user cancel');
      await actions.resolve({ signed: true });
    });

    expect(mockWallet.rejectApproval).not.toHaveBeenCalled();
    expect(mockWallet.resolveApproval).not.toHaveBeenCalled();

    unmount();
  });

  it('honours an explicit id outside a binding', async () => {
    const { actions, unmount } = mount(null);

    await act(async () => {
      await actions.reject('user cancel', false, false, 'a');
    });

    expect(mockWallet.rejectApproval).toHaveBeenCalledWith(
      'user cancel',
      false,
      false,
      'a'
    );

    unmount();
  });
});
