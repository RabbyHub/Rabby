import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  WalletProvider,
  useCommonPopupView,
  useWallet,
} from '@/ui/utils/WalletContext';

describe('WalletProvider contexts', () => {
  let container: HTMLDivElement;
  let root: Root;
  const wallet = { id: 'wallet' } as any;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('does not re-render useWallet()-only components when the common popup state changes', () => {
    let walletRenders = 0;
    let seenWallet: unknown;
    let popupRenders = 0;
    let popupView: ReturnType<typeof useCommonPopupView> | undefined;

    const WalletOnly = () => {
      walletRenders++;
      seenWallet = useWallet();
      return null;
    };
    const PopupConsumer = () => {
      popupRenders++;
      popupView = useCommonPopupView();
      return null;
    };

    act(() =>
      root.render(
        React.createElement(
          WalletProvider,
          { wallet },
          React.createElement(WalletOnly),
          React.createElement(PopupConsumer)
        )
      )
    );
    expect(seenWallet).toBe(wallet);
    expect(walletRenders).toBe(1);
    expect(popupRenders).toBe(1);

    act(() => popupView!.setHeight(420));
    act(() => popupView!.setTitle('Assets'));
    act(() => popupView!.setVisible(true));

    expect(popupView!.height).toBe(420);
    expect(popupView!.visible).toBe(true);
    expect(popupRenders).toBe(4);
    // Before the split, all three updates re-rendered every useWallet() caller.
    expect(walletRenders).toBe(1);
  });
});
