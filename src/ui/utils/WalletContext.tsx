import React, { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { WalletController } from 'background/controller/wallet';

const WalletContext = createContext<{ wallet: WalletController } | null>(null);

const WalletProvider = ({
  children,
  wallet,
}: {
  children?: ReactNode;
  wallet: WalletController;
}) => (
  <WalletContext.Provider value={{ wallet }}>{children}</WalletContext.Provider>
);

const useWallet = () => {
  const { wallet } = useContext(WalletContext) as { wallet: WalletController };

  return wallet;
};

export { WalletProvider, useWallet };
