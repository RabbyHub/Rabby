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
    <div className="flex items-center justify-center gap-[4px] bg-rb-neutral-bg-3 rounded-[12px] h-[40px] border border-rb-neutral-bg-2">
      <button
        onClick={handleThemeToggle}
        className={clsx(
          'w-[48px] h-[36px] rounded-[10px] flex items-center justify-center',
          !isDarkTheme ? 'bg-rb-neutral-foot' : ''
        )}
      >
        <RcIconSun className="w-[20px] h-[20px]" />
      </button>
      <button
        onClick={handleThemeToggle}
        className={clsx(
          'w-[48px] h-[36px] rounded-[10px] flex items-center justify-center',
          isDarkTheme ? 'bg-rb-neutral-foot' : ''
        )}
      >
        <RcIconMoon className="w-[20px] h-[20px]" />
      </button>
    </div>
  );
};
