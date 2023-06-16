import { useCommonPopupView } from './WalletContext';

/**
 * New popup window for approval
 */
export const useApprovalPopup = () => {
  const { activePopup } = useCommonPopupView();

  const showPopup = () => {
    activePopup('Approval');
  };

  const enablePopup = (type: string) => {
    if (type) {
      return true;
    }

    return false;
  };

  return {
    showPopup,
    enablePopup,
  };
};
