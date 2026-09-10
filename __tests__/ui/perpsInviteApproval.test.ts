const mockResolveApproval = jest.fn();
jest.mock('@/ui/assets/desktop/common', () => ({
  RcIconSuccessCC: () => null,
}));
jest.mock('@/ui/assets/icon-rabby-circle.svg', () => 'rabby.svg');
jest.mock('@/ui/assets/perps/icon-hyperliquid.svg', () => 'hyperliquid.svg');
jest.mock('@/ui/assets/perps/star-bg.svg', () => ({
  ReactComponent: () => null,
}));
jest.mock('ui/assets/component/close-cc.svg', () => ({
  ReactComponent: () => null,
}));
jest.mock('ui/assets/metamask-mode-circle.svg', () => 'metamask.svg');
jest.mock('@/ui/component/AccountSelector', () => ({
  AccountSelector: () => null,
}));
jest.mock('@/ui/component/ThemeMode/ThemeIcon', () => () => null);
jest.mock('ui/component', () => ({ FallbackSiteLogo: () => null }));
jest.mock('styled-components', () => ({
  __esModule: true,
  default: { div: () => 'div' },
}));
jest.mock('antd', () => ({
  Button: ({ children, onClick }) =>
    require('react').createElement('button', { onClick }, children),
  message: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/ui/store', () => ({ useRabbySelector: () => false }));
jest.mock('@/ui/views/Perps/constants', () => ({
  PERPS_REFERENCE_CODE: 'RABBY',
}));
jest.mock('@/ui/views/Perps/sdkManager', () => ({ getPerpsSDK: jest.fn() }));
jest.mock('ui/utils', () => ({
  useWallet: jest.fn(),
  useApproval: () => [jest.fn(), mockResolveApproval, jest.fn()],
}));
jest.mock('@/ui/hooks/useMiniApprovalDirectSign', () => ({
  supportedDirectSign: () => false,
}));
jest.mock('@/ui/component/MiniSignV2', () => ({ typedDataSignatureStore: {} }));
jest.mock('@/ui/views/Approval/components/map', () => ({
  WaitingSignMessageComponent: { ImKey: 'ImKeyHardwareWaiting' },
}));
jest.mock('consts', () => ({
  KEYRING_CLASS: { HARDWARE: { TREZOR: 'Trezor' } },
  KEYRING_TYPE: {},
  EVENTS: { RELOAD_APPROVAL: 'reload' },
}));
jest.mock('@/eventBus', () => ({
  __esModule: true,
  default: { emit: jest.fn() },
}));
jest.mock('ahooks', () => ({
  useEventListener: jest.fn(),
  useRequest: jest.fn((runAsync) => ({ runAsync })),
}));

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useRequest } from 'ahooks';
import { useWallet } from 'ui/utils';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import eventBus from '@/eventBus';
import { PerpsInviteContent } from '@/ui/views/Approval/components/Connect/PerpsInviteContent';

it('hands an ImKey invite to a new approval without resolving the previous Connect', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const prepared = {
    action: { type: 'setReferrer' },
    nonce: 123,
    typedData: { message: 'invite' },
  };
  const wallet = {
    getSite: jest.fn(async () => ({})),
    getCurrentAccount: jest.fn(async () => ({ type: 'ImKey', address: '0xa' })),
    signPerpsSendSetReferrer: jest.fn(async () => undefined),
    sendRequest: jest.fn(async () => 'signature'),
  };
  const exchange = {
    prepareSetReferrer: jest.fn(() => prepared),
    sendSetReferrer: jest.fn(async () => undefined),
  };
  jest.mocked(useWallet).mockReturnValue(wallet as any);
  jest
    .mocked(getPerpsSDK)
    .mockReturnValue({ initAccount: jest.fn(), exchange } as any);
  const root = createRoot(document.createElement('div'));
  try {
    await act(async () => {
      root.render(
        React.createElement(PerpsInviteContent, {
          params: { origin: 'https://app.hyperliquid.xyz' },
        })
      );
    });
    const invite = jest
      .mocked(useRequest)
      .mock.calls.at(-1)![0] as () => Promise<boolean>;
    await expect(invite()).resolves.toBe(true);
    expect(wallet.signPerpsSendSetReferrer).toHaveBeenCalledWith({
      address: '0xa',
      ...prepared,
    });
    expect(eventBus.emit).toHaveBeenCalledWith('reload');
    expect(mockResolveApproval).not.toHaveBeenCalled();
    expect(wallet.sendRequest).not.toHaveBeenCalled();
    expect(exchange.sendSetReferrer).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
  }
});
