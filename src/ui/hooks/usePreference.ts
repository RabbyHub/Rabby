import { useEffect, useLayoutEffect, useState } from 'react';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { DARK_MODE_TYPE } from '@/constant';
import { getUiType } from '../utils';

const darkModeClassName = 'dark';

function checkIsDarkMode() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (err) {
    return false;
  }
}

function useIsDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(checkIsDarkMode());

  useEffect(() => {
    const mqList = window.matchMedia('(prefers-color-scheme: dark)');

    const listener = (event: MediaQueryListEvent) => {
      setIsDarkMode(event.matches);
    };

    mqList.addEventListener('change', listener);

    return () => {
      mqList.removeEventListener('change', listener);
    };
  }, []);

  return isDarkMode;
}

const uiTypes = getUiType();

function isFinalDarkMode(themeMode: DARK_MODE_TYPE, isDarkOnSystem: boolean) {
  const userSelectedDark = themeMode === DARK_MODE_TYPE.dark;
  const useSystemAndOnDark =
    themeMode === DARK_MODE_TYPE.system && isDarkOnSystem;

  if (process.env.DEBUG) {
    return userSelectedDark || useSystemAndOnDark;
  }

  if (uiTypes.isTab) {
    const hashValue = window.location.hash;

    return (
      userSelectedDark &&
      [
        '#/mnemonics/create',
        '#/import/mnemonics',

        '#/import/select-address',

        '#/pending-detail',

        '#/import/hardware/ledger-connect',
        '#/import/hardware/keystone',
        '#/import/hardware/qrcode',

        '#/dapp-search',
        '#/approval-manage',
      ].includes(hashValue)
    );
  }

  return userSelectedDark;
}

export function useThemeModeOnMain() {
  const dispatch = useRabbyDispatch();

  const themeMode = useRabbySelector((state) => state.preference.themeMode);

  const isDarkOnSystem = useIsDarkMode();

  useEffect(() => {
    (async () => {
      await dispatch.preference.getPreference('themeMode');
    })();
  }, [dispatch]);

  useLayoutEffect(() => {
    const isDark = isFinalDarkMode(themeMode, isDarkOnSystem);

    if (isDark) {
      // see https://v2.tailwindcss.com/docs/dark-mode
      document.documentElement.classList.add(darkModeClassName);
    } else {
      document.documentElement.classList.remove(darkModeClassName);
    }
  }, [themeMode, isDarkOnSystem]);
}

export function useThemeMode() {
  const themeMode = useRabbySelector((state) => state.preference.themeMode);

  const isDarkOnSystem = useIsDarkMode();

  return {
    isDarkTheme: isFinalDarkMode(themeMode, isDarkOnSystem),
  };
}
