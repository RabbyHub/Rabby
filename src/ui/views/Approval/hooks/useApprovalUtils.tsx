import React, { createContext, useContext } from 'react';
import type { Approval } from 'background/service/notification';
import { ApprovalBindingContext } from '@/ui/utils/approval-context';
import { useCommonPopupView } from '@/ui/utils/WalletContext';
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

export const ApprovalUtilsProvider = ({
  approval,
  children,
}: {
  // The approval this page was mounted for. Required, so that a new approval
  // container cannot silently forget it: `useApproval` binds its resolve/reject
  // to this, and a page mounted without one cannot act on anything. Pass null
  // where there is genuinely no approval (the in-page mini signer).
  approval: Approval | null;
  children: React.ReactNode;
}) => {
  const value = useApprovalUtilsState();
  const { setApprovalBinding } = useCommonPopupView();

  const id = approval?.id;
  const component = approval?.data.approvalComponent;
  const binding = React.useMemo(
    () => (id && component ? { id, component } : null),
    [id, component]
  );

  // Hardware prompts and the like mount outside this tree but inside the same
  // window, so hand them the binding too. A window with no approval page never
  // sets one, which is what keeps a dashboard popup from acting on the approval
  // pending in the notification window.
  React.useEffect(() => {
    if (!binding) return;
    setApprovalBinding(binding);
    // The route and the approval popup can both be mounted at once, so only
    // withdraw our own binding: clearing unconditionally would let whichever
    // unmounts first take the live one down with it.
    return () =>
      setApprovalBinding((current) => (current === binding ? null : current));
  }, [binding]);

  return (
    <ApprovalBindingContext.Provider value={binding}>
      <ApprovalUtilsContext.Provider value={value}>
        {children}
      </ApprovalUtilsContext.Provider>
    </ApprovalBindingContext.Provider>
  );
};
