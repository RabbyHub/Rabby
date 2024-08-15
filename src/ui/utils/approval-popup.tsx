import { useCommonPopupView } from './WalletContext';

/**
 * New popup window for approval
 */
export const useApprovalPopup = () => {
  const {
    activePopup,
    closePopup,
    isShowSilentApproval,
    setIsShowSilentApproval,
  } = useCommonPopupView();

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
    closePopup,
    isShowSilentApproval,
    setIsShowSilentApproval,
  };
};
