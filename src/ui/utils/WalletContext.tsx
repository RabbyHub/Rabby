import React, { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { Object } from 'ts-toolbelt';
import { WalletController as WalletControllerClass } from 'background/controller/wallet';

// TODO: implement here but not used now to avoid too much ts checker error.
// we will use it on almost biz store ready.
export type WalletControllerType = Object.Merge<
  {
    [key in keyof WalletControllerClass]: WalletControllerClass[key] extends (
      ...args: any
    ) => any
      ? <T = ReturnType<WalletControllerClass[key]>>(
          ...args: Parameters<WalletControllerClass[key]>
        ) => T extends Promise<any> ? T : Promise<T>
      : WalletControllerClass[key];
  },
  Record<string, <T = any>(...params: any) => Promise<T>>
>;

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
  const { wallet } = (useContext(WalletContext) as unknown) as {
    wallet: WalletController;
  };

  return wallet;
};

export { WalletProvider, useWallet };
