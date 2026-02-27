import { DARK_MODE_TYPE } from '@/constant';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import React, { useCallback } from 'react';
import { ReactComponent as RcIconSun } from '@/ui/assets/perps/icon-sun.svg';
import { ReactComponent as RcIconMoon } from '@/ui/assets/perps/icon-moon.svg';

export const SwitchThemeBtn = () => {
  const themeMode = useRabbySelector((state) => state.preference.themeMode);
  const { isDarkTheme } = useThemeMode();
  const dispatch = useRabbyDispatch();
  const handleThemeToggle = useCallback(() => {
    const newThemeMode =
      themeMode === DARK_MODE_TYPE.dark
        ? DARK_MODE_TYPE.light
        : DARK_MODE_TYPE.dark;
    dispatch.preference.switchThemeMode(newThemeMode);
  }, [dispatch, themeMode]);

  return (
    <div className="flex items-center justify-center bg-r-neutral-line rounded-[12px] p-[1px]">
      <button
        onClick={handleThemeToggle}
        className={clsx(
          'w-[28px] h-[24px] rounded-[11px] flex items-center justify-center',
          !isDarkTheme
            ? 'bg-r-neutral-bg-1 text-r-neutral-body'
            : 'text-r-neutral-foot'
        )}
      >
        <RcIconSun className="w-[16px] h-[16px]" />
      </button>
      <button
        onClick={handleThemeToggle}
        className={clsx(
          'w-[28px] h-[24px] rounded-[11px] flex items-center justify-center',
          isDarkTheme
            ? 'bg-r-neutral-bg-1 text-r-neutral-body'
            : 'text-r-neutral-foot'
        )}
      >
        <RcIconMoon className="w-[16px] h-[16px]" />
      </button>
    </div>
  );
};
