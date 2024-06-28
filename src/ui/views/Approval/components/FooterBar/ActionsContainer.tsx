import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from '@/background/service/preference';
import { Chain } from '@debank/common';
import { useCommonPopupView, useWallet } from '@/ui/utils';
import { ReactComponent as ArrowDownSVG } from '@/ui/assets/approval/arrow-down-blue.svg';

export interface Props {
  onSubmit(): void;
  onCancel(): void;
  account: Account;
  disabledProcess: boolean;
  enableTooltip?: boolean;
  tooltipContent?: React.ReactNode;
  children?: React.ReactNode;
  chain?: Chain;
  gasLess?: boolean;
  gasLessThemeColor?: string;
  isGasNotEnough?: boolean;
}

export const ActionsContainer: React.FC<Pick<Props, 'onCancel'>> = ({
  children,
  onCancel,
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [
    displayBlockedRequestApproval,
    setDisplayBlockedRequestApproval,
  ] = React.useState(false);
  const [
    displayCancelAllApproval,
    setDisplayCancelAllApproval,
  ] = React.useState(false);
  const { activePopup, setData } = useCommonPopupView();

  React.useEffect(() => {
    wallet
      .checkNeedDisplayBlockedRequestApproval()
      .then(setDisplayBlockedRequestApproval);
    wallet
      .checkNeedDisplayCancelAllApproval()
      .then(setDisplayCancelAllApproval);
  }, []);

  const displayPopup =
    displayBlockedRequestApproval || displayCancelAllApproval;

  const activeCancelPopup = () => {
    setData({
      onCancel,
      displayBlockedRequestApproval,
      displayCancelAllApproval,
    });
    activePopup('CancelApproval');
  };

  return (
    <div className="flex gap-[12px] relative justify-end">
      {children}
      <Button
        type="ghost"
        className={clsx(
          'w-[102px] h-[48px] border-blue-light text-blue-light',
          'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
          'rounded-[8px]',
          'before:content-none',
          'z-10',
          'flex items-center justify-center gap-2'
        )}
        onClick={displayPopup ? activeCancelPopup : onCancel}
      >
        {t('global.cancelButton')}

        {displayPopup && <ArrowDownSVG className="w-16" />}
      </Button>
    </div>
  );
};
