import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { NewUserImportOneKey } from '@/ui/views/NewUserImport/ImportOnekey';

const mockUsb = jest.fn();
const mockPush = jest.fn();
const mockSetStore = jest.fn();
const mockWallet = {
  authorizeOneKeyHIDPermission: jest.fn(),
  connectHardware: jest.fn(),
  requestKeyring: jest.fn(),
  boot: jest.fn(),
  unlockHardwareAccount: jest.fn(),
};
jest.mock('@/ui/utils', () => ({ useWallet: () => mockWallet }));
jest.mock('@/ui/utils/onekey', () => ({
  getOneKeyFirstOneKeyDevice: () => mockUsb(),
}));
jest.mock('@/constant', () => ({
  HARDWARE_KEYRING_TYPES: {
    Onekey: { type: 'Onekey Hardware' },
    Keystone: { type: 'keystone' },
  },
  WALLET_BRAND_TYPES: { ONEKEY: 'OneKey' },
}));
jest.mock('@/ui/views/NewUserImport/hooks/useNewUserGuideStore', () => ({
  useNewUserGuideStore: () => ({
    store: { password: 'test' },
    setStore: mockSetStore,
  }),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mockPush }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('antd', () => ({
  Button: ({ children, onClick }) =>
    React.createElement('button', { onClick }, children),
  message: { error: jest.fn() },
}));
jest.mock('@/ui/component/NewUserImport', () => ({
  Card: ({ children }) => children,
}));
jest.mock('@/ui/component/PillsSwitch', () => () => null);
jest.mock('@/ui/component/Progress', () => () => null);
jest.mock('ui/component/QRCodeReader', () => () => null);
jest.mock('ui/views/QRCodeCheckerDetail', () => () => null);
jest.mock('@/ui/views/ImportHardware/OneKeyConnect/ImageCarousel', () => ({
  ImageCarousel: () => null,
}));
jest.mock('@/ui/views/ImportHardware/OneKeyConnect/utils', () => ({}));
jest.mock('@/ui/utils/ledger', () => ({
  LedgerHDPathType: { BIP44: 'BIP44' },
}));
jest.mock('@ngraveio/bc-ur', () => ({ URDecoder: jest.fn() }));

describe('OneKey first account import', () => {
  const type = 'Onekey Hardware';
  let root: ReturnType<typeof createRoot>;
  let button: HTMLButtonElement;
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.resetAllMocks();
    mockWallet.connectHardware.mockResolvedValue(12);
    mockWallet.requestKeyring.mockResolvedValue([{ index: 1 }]);
    const container = document.createElement('div');
    root = createRoot(container);
    act(() => root.render(React.createElement(NewUserImportOneKey)));
    button = container.querySelector('button')!;
  });
  afterEach(() => act(() => root.unmount()));

  it('imports the first BIP44 account once and hands off without cancelling the shared keyring', async () => {
    await act(async () => {
      button.click();
      button.click();
    });
    expect(mockUsb).toHaveBeenCalledTimes(1);
    expect(mockWallet.requestKeyring).toHaveBeenCalledWith(
      type,
      'getAddresses',
      12,
      0,
      1
    );
    expect(mockWallet.unlockHardwareAccount).toHaveBeenCalledWith(
      type,
      [0],
      12
    );
    expect(mockSetStore).toHaveBeenCalledWith({ clearKeyringId: undefined });
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/new-user/success' })
    );
    act(() => root.render(null));
    expect(mockWallet.requestKeyring).toHaveBeenCalledTimes(1);
  });

  it('releases the pending import by its own ID and ignores a late address response', async () => {
    let finish!: (accounts: { index: number }[]) => void;
    mockWallet.requestKeyring.mockImplementation((_type, action) =>
      action === 'getAddresses'
        ? new Promise((done) => {
            finish = done;
          })
        : Promise.resolve()
    );
    await act(async () => {
      button.click();
    });
    act(() => root.render(null));
    expect(mockWallet.requestKeyring).toHaveBeenCalledWith(
      type,
      'cleanUp',
      12,
      true
    );
    await act(async () => {
      finish([{ index: 1 }]);
    });
    expect(mockWallet.boot).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
