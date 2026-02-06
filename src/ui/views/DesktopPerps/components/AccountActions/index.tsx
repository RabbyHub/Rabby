import React, { useCallback } from 'react';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { DARK_MODE_TYPE } from '@/constant';
import clsx from 'clsx';
import { ReactComponent as RcIconMoon } from '@/ui/assets/perps/icon-moon.svg';
import { ReactComponent as RcIconSun } from '@/ui/assets/perps/icon-sun.svg';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconPerpsWallet } from '@/ui/assets/perps/IconPerpsWallet.svg';
import { useHistory, useLocation } from 'react-router-dom';
import { DepositPending } from '../DepositWithdrawModal/DepositPending';
import { PopupType } from '../../index';
import BigNumber from 'bignumber.js';
import { Skeleton, Tooltip } from 'antd';

export const AccountActions: React.FC = () => {
  const dispatch = useRabbyDispatch();
  const clearinghouseState = useRabbySelector(
    (state) => state.perps.clearinghouseState
  );
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const availableBalance = Number(clearinghouseState?.withdrawable || 0);
  // Get pending history count
  const localLoadingHistory = useRabbySelector(
    (state) => state.perps.localLoadingHistory
  );
  const pendingCount = localLoadingHistory.length;

  const handleDeposit = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('action', 'deposit');
    history.push({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
  }, [history, location]);

  return (
    <div className="flex items-center gap-[12px]">
      {/* Available Balance */}
      <div className="flex items-center gap-[8px] pl-[11px] pr-[7px] py-[7px] rounded-[16px] border border-rb-neutral-line">
        <Tooltip
          overlayClassName="rectangle"
          placement="bottom"
          trigger="hover"
          title={t('page.perpsPro.accountActions.availableBalanceTips')}
        >
          <div className="flex items-center gap-[4px]">
            <IconPerpsWallet
              viewBox="0 0 20 20"
              className="w-[16px] h-[16px]"
            />
            <div className="flex items-start flex-col">
              {!clearinghouseState ? (
                <Skeleton.Button
                  active={true}
                  className="h-[18px] block rounded-[4px]"
                  style={{ width: 80 }}
                />
              ) : (
                <span className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
                  {formatUsdValue(availableBalance, BigNumber.ROUND_DOWN)}
                </span>
              )}
            </div>
          </div>
        </Tooltip>

        <button
          onClick={handleDeposit}
          className={clsx(
            'ml-6 px-[12px] h-[28px] rounded-[6px] text-[15px] leading-[18px] font-medium flex items-center justify-center',
            'bg-rb-brand-light-1 text-rb-brand-default'
          )}
        >
          {t('page.perpsPro.accountActions.deposit')}
        </button>

        {/* Deposit Button */}
        {pendingCount > 0 ? (
          <div
            onClick={handleDeposit}
            className={clsx(
              'px-[12px] h-[28px] rounded-[6px] text-[15px] leading-[18px] font-medium flex items-center gap-[8px] cursor-pointer justify-center',
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
