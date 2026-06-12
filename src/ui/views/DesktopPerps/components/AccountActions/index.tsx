import React, { useCallback, useMemo } from 'react';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { DARK_MODE_TYPE } from '@/constant';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconPerpsWallet } from '@/ui/assets/perps/IconPerpsWallet.svg';
import { useHistory, useLocation } from 'react-router-dom';
import { DepositPending } from '../DepositWithdrawModal/DepositPending';
import { PopupType } from '../../index';
import BigNumber from 'bignumber.js';
import { Skeleton, Tooltip } from 'antd';
import { usePerpsAccount } from '@/ui/views/Perps/hooks/usePerpsAccount';
import usePerpsPopupNav from '../../hooks/usePerpsPopupNav';

interface AccountActionsProps {
  compact?: boolean;
}

export const AccountActions: React.FC<AccountActionsProps> = ({
  compact = false,
}) => {
  const { t } = useTranslation();

  // Get pending history count
  const localLoadingHistory = useRabbySelector(
    (state) => state.perps.localLoadingHistory
  );
  const pendingCount = localLoadingHistory.length;

  const { openPerpsPopup } = usePerpsPopupNav();
  const handleDeposit = useCallback(() => {
    openPerpsPopup('deposit');
  }, [openPerpsPopup]);

  return (
    <div
      className={clsx(
        'flex items-center',
        compact ? 'gap-[8px]' : 'gap-[12px]'
      )}
    >
      {/* Available Balance */}
      <div
        className={clsx(
          'flex items-center gap-[8px]',
          compact
            ? 'desktop-perps-topbar-account-actions-inner'
            : 'pl-[6px] pr-[6px] h-[32px]'
        )}
      >
        <button
          onClick={handleDeposit}
          className={clsx(
            'px-[12px] font-medium flex items-center justify-center border border-solid cursor-pointer',
            compact
              ? 'desktop-perps-topbar-deposit-button'
              : 'ml-6 h-[32px] rounded-[8px] text-13 border-rb-brand-default text-rb-brand-default'
          )}
        >
          {t('page.perpsPro.accountActions.deposit')}
        </button>

        {/* Deposit Button */}
        {pendingCount > 0 ? (
          <div
            onClick={handleDeposit}
            className={clsx(
              'px-[12px] rounded-[6px] font-medium flex items-center gap-[8px] cursor-pointer justify-center',
              compact
                ? 'desktop-perps-topbar-pending-button'
                : 'h-[28px] text-[15px] leading-[18px]',
              'bg-rb-orange-light-1 text-rb-orange-default'
            )}
          >
            {t('page.perpsPro.accountActions.pending')}
            <DepositPending pendingCount={pendingCount} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
