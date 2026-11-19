import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

const mockResolve = jest.fn();
const mockReject = jest.fn();
const mockBind = jest.fn();
const mockForm = {
  values: {} as Record<string, unknown>,
  getFieldsValue: () => mockForm.values,
  setFieldsValue: (values: Record<string, unknown>) => {
    mockForm.values = values;
  },
  validateFields: jest.fn(),
  setFields: jest.fn(),
};
const mockWallet = {
  addCustomTestnetFromApproval: jest.fn(),
  addCustomTestnet: jest.fn(),
  updateConnectSite: jest.fn(),
  getConnectedSite: jest.fn(),
  openapi: { getChainListByIds: jest.fn() },
};
const mockButtons = new Map<string, () => Promise<void>>();
jest.mock('ui/utils', () => ({
  useWallet: () => mockWallet,
  bindApproval: (...args: unknown[]) => mockBind(...args),
  useApproval: () => [jest.fn(), mockResolve, mockReject],
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('antd', () => ({
  Button: ({ children, onClick, loading }: any) => {
    mockButtons.set(children, onClick);
    return React.createElement(
      'button',
      { onClick, disabled: loading },
      children
    );
  },
  Spin: () => null,
}));
jest.mock('antd/lib/form/Form', () => ({ useForm: () => [mockForm] }));
jest.mock('@ant-design/icons', () => ({ LoadingOutlined: () => null }));
jest.mock('@/ui/views/CustomTestnet/components/CustomTestnetForm', () => ({
  CustomTestnetForm: () => null,
}));
jest.mock('@/ui/hooks/usePreference', () => ({
  useThemeMode: () => ({ isDarkTheme: true }),
}));
jest.mock('@/background/service/customTestnet', () => ({
  createTestnetChain: (values: unknown) => values,
}));

import AddChain from '@/ui/views/Approval/components/AddChain/AddChain';
import SwitchChain from '@/ui/views/Approval/components/SwitchChain/SwitchChain';

describe.each([
  ['AddChain', AddChain],
  ['SwitchChain', SwitchChain],
] as const)('%s network approval', (component, Component) => {
  let container: HTMLDivElement;
  let root: Root;
  const props = {
    approvalId: 'network-approval',
    params: {
      data: [
        {
          chainId: '0x1e240',
          chainName: 'Custom network',
          rpcUrls: ['https://rpc.example'],
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          blockExplorerUrls: [],
        },
      ],
      session: { origin: 'https://dapp.example', name: 'Dapp', icon: '' },
    },
  };
  const flush = async () =>
    act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
  const start = () => {
    let pending!: Promise<void>;
    act(() => {
      pending = mockButtons.get('global.addButton')!();
    });
    return pending;
  };
  const render = async () => {
    act(() =>
      root.render(
        React.createElement(Component as React.ComponentType<any>, props)
      )
    );
    await flush();
  };

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    mockButtons.clear();
    mockForm.values = {};
    mockForm.validateFields.mockResolvedValue(undefined);
    mockWallet.addCustomTestnetFromApproval.mockResolvedValue({
      enum: 'CUSTOM',
      id: 123456,
    });
    mockWallet.openapi.getChainListByIds.mockResolvedValue([
      {
        name: 'Custom network',
        chain_id: 123456,
        native_currency: { symbol: 'ETH' },
        rpc: 'https://rpc.example',
        explorer: '',
      },
    ]);
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  });

  test('passes the exact approval reference and settles only after successful validation', async () => {
    await render();
    expect(mockBind).toHaveBeenCalledWith(props.approvalId, component);
    await act(async () => {
      await start();
    });
    expect(
      mockWallet.addCustomTestnetFromApproval
    ).toHaveBeenCalledWith(
      expect.objectContaining({ id: 123456, rpcUrl: 'https://rpc.example' }),
      { id: props.approvalId, component }
    );
    expect(mockResolve).toHaveBeenCalledTimes(1);
    expect(mockWallet.addCustomTestnet).not.toHaveBeenCalled();
    expect(mockWallet.updateConnectSite).not.toHaveBeenCalled();
  });

  test('keeps Cancel usable during RPC validation without settling or changing the site afterward', async () => {
    let fail!: (reason: unknown) => void;
    mockWallet.addCustomTestnetFromApproval.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        })
    );
    await render();
    const pending = start();
    await flush();
    expect(mockWallet.addCustomTestnetFromApproval).toHaveBeenCalledTimes(1);
    const cancel = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'global.cancelButton'
    )!;
    expect(cancel.disabled).toBe(false);
    act(() => cancel.click());
    expect(mockReject).toHaveBeenCalledTimes(1);
    await act(async () => {
      fail({ code: 4001 });
      await expect(pending).resolves.toBeUndefined();
    });
    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockWallet.updateConnectSite).not.toHaveBeenCalled();
  });

  test('keeps field-validation failures local without starting a network write', async () => {
    mockForm.validateFields.mockRejectedValueOnce(new Error('invalid form'));
    await render();
    await act(async () => {
      await start();
    });
    expect(mockWallet.addCustomTestnetFromApproval).not.toHaveBeenCalled();
    expect(mockResolve).not.toHaveBeenCalled();
  });

  test('keeps RPC validation errors visible without resolving the approval', async () => {
    mockWallet.addCustomTestnetFromApproval.mockResolvedValueOnce({
      error: { key: 'rpcUrl', message: 'RPC does not match the chainID' },
    });
    await render();
    await act(async () => {
      await expect(start()).rejects.toThrow('RPC does not match the chainID');
    });
    expect(mockForm.setFields).toHaveBeenCalledWith([
      { name: 'rpcUrl', errors: ['RPC does not match the chainID'] },
    ]);
    expect(mockResolve).not.toHaveBeenCalled();
  });
});
