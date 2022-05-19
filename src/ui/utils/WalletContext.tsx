import React, { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { Object } from 'ts-toolbelt';

export type WalletController = Object.Merge<
  {
    openapi: {
      [key: string]: <T = any>(...params: any) => Promise<T>;
    };
  },
  Record<string, <T = any>(...params: any) => Promise<T>>
>;

const WalletContext = createContext<{
  wallet: WalletController;
} | null>(null);

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
  const { wallet } = useContext(WalletContext) as {
    wallet: WalletController;
  };

  return wallet;
};

export { WalletProvider, useWallet };
