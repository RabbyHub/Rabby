import { createContext, useContext } from 'react';

const WalletContext = createContext();

const WalletProvider = ({ children, wallet }) => (
  <WalletContext.Provider value={{ wallet }}>{children}</WalletContext.Provider>
);

const useWallet = () => {
  const { wallet } = useContext(WalletContext);

  return wallet;
}

export {
  WalletProvider,
  useWallet,
}
