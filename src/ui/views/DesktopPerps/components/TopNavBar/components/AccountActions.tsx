import React, { useCallback } from 'react';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { DARK_MODE_TYPE } from '@/constant';
import clsx from 'clsx';
import { ReactComponent as RcIconMoon } from '@/ui/assets/perps/icon-moon.svg';
import { ReactComponent as RcIconSun } from '@/ui/assets/perps/icon-sun.svg';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconPerpsWallet } from '@/ui/assets/perps/IconPerpsWallet.svg';
import { useHistory } from 'react-router-dom';
import { DepositPending } from '../../DepositWithdrawModal/DepositPending';

export const AccountActions: React.FC = () => {
  const dispatch = useRabbyDispatch();
  const { isDarkTheme } = useThemeMode();
  const clearinghouseState = useRabbySelector(
    (state) => state.perps.clearinghouseState
  );
  const themeMode = useRabbySelector((state) => state.preference.themeMode);
  const { t } = useTranslation();
  const availableBalance = Number(
    clearinghouseState?.marginSummary?.accountValue || 0
  );
  // Get pending history count
  const localLoadingHistory = useRabbySelector(
    (state) => state.perps.localLoadingHistory
  );
  const pendingCount = localLoadingHistory.length;

  const handleThemeToggle = useCallback(() => {
    const newThemeMode =
      themeMode === DARK_MODE_TYPE.dark
        ? DARK_MODE_TYPE.light
        : DARK_MODE_TYPE.dark;
    dispatch.preference.switchThemeMode(newThemeMode);
  }, [dispatch, themeMode]);

  const history = useHistory();
  const handleDeposit = useCallback(() => {
    const currentPathname = history.location.pathname;

    history.replace(`${currentPathname}?action=deposit`);
  }, [history]);

  return (
    <div className="flex items-center gap-[12px]">
      {/* Theme Toggle */}
      <div className="flex items-center gap-[4px] bg-rb-neutral-bg-3 rounded-[10px] p-[4px] border border-rb-neutral-bg-2">
        <button
          onClick={handleThemeToggle}
          className={clsx(
            'w-[48px] h-[36px] rounded-[8px] flex items-center justify-center',
            !isDarkTheme ? 'bg-rb-neutral-foot' : ''
          )}
        >
          <RcIconSun className="w-[20px] h-[20px]" />
        </button>
        <button
          onClick={handleThemeToggle}
          className={clsx(
            'w-[48px] h-[36px] rounded-[8px] flex items-center justify-center',
            isDarkTheme ? 'bg-rb-neutral-foot' : ''
          )}
        >
          <RcIconMoon className="w-[20px] h-[20px]" />
        </button>
      </div>

      {/* Available Balance */}
      {Boolean(clearinghouseState) && (
        <div className="flex items-center gap-[30px] pl-12 pr-8 py-[8px] bg-rb-neutral-bg-3 rounded-[12px] border border-rb-neutral-bg-2">
          <div className="flex items-center gap-[6px]">
            <IconPerpsWallet />
            <span className="text-[15px] font-medium text-r-neutral-title-1">
              ${splitNumberByStep(availableBalance.toFixed(2))}
            </span>
          </div>

          {/* Deposit Button */}
          {pendingCount > 0 ? (
            <div
              onClick={handleDeposit}
              className={clsx(
                'px-[12px] h-[28px] rounded-[6px] text-[15px] font-medium flex items-center gap-8 cursor-pointer justify-center',
                'bg-rb-orange-light-1 text-rb-orange-default'
              )}
            >
              {t('page.perpsPro.accountActions.deposit')}
              <DepositPending pendingCount={pendingCount} />
            </div>
          ) : (
            <button
              onClick={handleDeposit}
              className={clsx(
                'px-[12px] h-[28px] rounded-[6px] text-[15px] font-medium flex items-center justify-center',
                'bg-rb-brand-light-1 text-rb-brand-default'
              )}
            >
              {t('page.perpsPro.accountActions.deposit')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
