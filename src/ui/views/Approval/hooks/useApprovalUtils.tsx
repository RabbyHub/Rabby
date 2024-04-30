import React, { createContext, useContext } from 'react';
import { useApprovalAlias } from './useApprovalAlias';

/**
 * useApprovalUtils
 * @description some global state for approval page
 */
const useApprovalUtilsState = () => {
  const alias = useApprovalAlias();

  return { alias };
};

const ApprovalUtilsContext = createContext<
  ReturnType<typeof useApprovalUtilsState>
>({} as any);

export const useApprovalUtils = () => {
  return useContext(ApprovalUtilsContext);
};

export const ApprovalUtilsProvider = ({ children }) => {
  const value = useApprovalUtilsState();

  return (
    <ApprovalUtilsContext.Provider value={value}>
      {children}
    </ApprovalUtilsContext.Provider>
  );
};
