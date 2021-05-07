import React, { ReactNode } from 'react';
import { createContext, useContext } from 'react';

const WalletContext: any = createContext(null);

const WalletProvider = ({
  children,
  wallet,
}: {
  children?: ReactNode;
  wallet: any;
}) => (
  <WalletContext.Provider value={{ wallet }}>{children}</WalletContext.Provider>
);

const useWallet = () => {
  const { wallet } = useContext(WalletContext);

  return wallet;
};

export { WalletProvider, useWallet };
