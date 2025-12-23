import React, { useCallback } from 'react';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { DARK_MODE_TYPE } from '@/constant';
import clsx from 'clsx';
import { ReactComponent as RcIconMoon } from '@/ui/assets/perps/icon-moon.svg';
import { ReactComponent as RcIconSun } from '@/ui/assets/perps/icon-sun.svg';
import { useTranslation } from 'react-i18next';

export const AccountActions: React.FC = () => {
  const dispatch = useRabbyDispatch();
  const { isDarkTheme } = useThemeMode();
  const { accountSummary, isLogin } = useRabbySelector((state) => state.perps);
  const themeMode = useRabbySelector((state) => state.preference.themeMode);
  const { t } = useTranslation();
  const availableBalance = Number(accountSummary?.withdrawable || 0);

  const handleThemeToggle = useCallback(() => {
    const newThemeMode =
      themeMode === DARK_MODE_TYPE.dark
        ? DARK_MODE_TYPE.light
        : DARK_MODE_TYPE.dark;
    dispatch.preference.switchThemeMode(newThemeMode);
  }, [dispatch, themeMode]);

  const handleDeposit = useCallback(() => {
    // TODO: Implement deposit functionality
    console.log('Deposit clicked');
  }, []);

  return (
    <div className="flex items-center gap-[12px]">
      {/* Theme Toggle */}
      <div className="flex items-center gap-[4px] bg-rb-neutral-bg-3 rounded-[8px] p-[4px] border border-rb-neutral-bg-2">
        <button
          onClick={handleThemeToggle}
          className={clsx(
            'w-[32px] h-[32px] rounded-[6px] flex items-center justify-center transition-all',
            !isDarkTheme ? 'bg-rb-neutral-foot' : ''
          )}
        >
          <RcIconSun className="w-[20px] h-[20px]" />
        </button>
        <button
          onClick={handleThemeToggle}
          className={clsx(
            'w-[32px] h-[32px] rounded-[6px] flex items-center justify-center transition-all',
            isDarkTheme ? 'bg-rb-neutral-foot' : ''
          )}
        >
          <RcIconMoon className="w-[20px] h-[20px]" />
        </button>
      </div>

      {/* Available Balance */}
      {isLogin && (
        <div className="flex items-center gap-[8px] px-[16px] py-[8px] bg-rb-neutral-bg-3 rounded-[20px] border border-rb-neutral-bg-2">
          <span className="text-[15px]  font-medium text-r-neutral-foot">
            {t('page.perpsPro.accountActions.available')}
          </span>
          <span className="text-[15px] font-medium text-r-neutral-foot">
            ${splitNumberByStep(availableBalance.toFixed(2))}
          </span>

          {/* Deposit Button */}
          <button
            onClick={handleDeposit}
            className={clsx(
              'px-[12px] h-[34px] rounded-[6px] text-[15px] font-medium transition-all flex items-center justify-center',
              'bg-rb-brand-light-1 text-rb-brand-default'
            )}
          >
            {t('page.perpsPro.accountActions.deposit')}
          </button>
        </div>
      )}
    </div>
  );
};
