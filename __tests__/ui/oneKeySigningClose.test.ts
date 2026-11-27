import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useCancelOneKeyOnClose } from '@/ui/hooks/useCancelOneKeyOnClose';

const mockWallet = { cancelOneKeySigning: jest.fn(async () => undefined) };
jest.mock('@/ui/utils', () => ({ useWallet: () => mockWallet }));
jest.mock('@/constant', () => ({
  KEYRING_CLASS: { HARDWARE: { ONEKEY: 'Onekey Hardware' } },
}));

describe('closing a OneKey Mini Sign task', () => {
  let root: ReturnType<typeof createRoot>;
  let cancel!: () => void;
  function render(type: string, signing: boolean) {
    function Signer() {
      cancel = useCancelOneKeyOnClose({ type, address: 'account' }, signing);
      return null;
    }
    act(() => root.render(React.createElement(Signer)));
  }
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    mockWallet.cancelOneKeySigning.mockClear();
    root = createRoot(document.createElement('div'));
  });
  afterEach(() => act(() => root.unmount()));

  it('sends one cancellation on manual close followed by browser unload', () => {
    render('Onekey Hardware', true);
    cancel();
    window.dispatchEvent(new Event('beforeunload'));
    expect(mockWallet.cancelOneKeySigning).toHaveBeenCalledTimes(1);
    expect(mockWallet.cancelOneKeySigning).toHaveBeenCalledWith('account');
  });

  it('cancels on component unmount without a button click', () => {
    render('Onekey Hardware', true);
    act(() => root.render(null));
    expect(mockWallet.cancelOneKeySigning).toHaveBeenCalledWith('account');
  });

  it.each([
    ['Onekey Hardware', false],
    ['Ledger Hardware', true],
  ] as const)('leaves %s task with active=%s alone', (type, signing) => {
    render(type, signing);
    window.dispatchEvent(new Event('beforeunload'));
    act(() => root.render(null));
    expect(mockWallet.cancelOneKeySigning).not.toHaveBeenCalled();
  });
});
