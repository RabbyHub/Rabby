import React, { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { Wallet } from 'background/controller/wallet';

const WalletContext = createContext<{ wallet: Wallet } | null>(null);

const WalletProvider = ({
  children,
  wallet,
}: {
  children?: ReactNode;
  wallet: Wallet;
}) => (
  <WalletContext.Provider value={{ wallet }}>{children}</WalletContext.Provider>
);

const useWallet = () => {
  const { wallet } = useContext(WalletContext) as { wallet: any };

  return wallet;
};

export { WalletProvider, useWallet };
