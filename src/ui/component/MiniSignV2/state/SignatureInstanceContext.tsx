import React, { createContext, useContext } from 'react';

import { SignatureManager } from './SignatureManager';

const SignatureInstanceContext = createContext<SignatureManager | null>(null);

export const SignatureInstanceProvider: React.FC<{
  instance: SignatureManager;
  children: React.ReactNode;
}> = ({ instance, children }) => (
  <SignatureInstanceContext.Provider value={instance}>
    {children}
  </SignatureInstanceContext.Provider>
);

export const useSignatureInstance = (): SignatureManager => {
  const instance = useContext(SignatureInstanceContext);
  if (!instance) {
    throw new Error(
      'SignatureInstanceProvider is required for MiniSignV2 consumers'
    );
  }

  return instance;
};
