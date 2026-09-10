import { createContext, useContext } from 'react';
import type { Approval } from 'background/service/notification';

export const ApprovalScopeContext = createContext<Approval | null>(null);

export const useApprovalScope = (): Approval => {
  const scope = useContext(ApprovalScopeContext);
  if (!scope) {
    throw new Error('useApprovalScope must be used within an approval subtree');
  }
  return scope;
};
