import React, { createContext, useContext } from 'react';

interface IKeystoneWaitingContext {
  [key: string]: any;
}

const KeystoneSignMethodContext = createContext<IKeystoneWaitingContext | null>(
  null
);

export const useKeystoneSignMethod = () => {
  const context = useContext(KeystoneSignMethodContext);
  return context;
};

export const KeystoneSignMethodProvider = ({ children, value }) => {
  return (
    <KeystoneSignMethodContext.Provider value={value}>
      {children}
    </KeystoneSignMethodContext.Provider>
  );
};
