import { useEffect, useLayoutEffect, useState } from 'react';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { DARK_MODE_TYPE } from '@/constant';

const darkModeClassName = 'in-dark-mode';

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
    // const isDark =
    //   themeMode === DARK_MODE_TYPE.dark ||
    //   (themeMode === DARK_MODE_TYPE.system && isDarkOnSystem);
    const isDark = themeMode === DARK_MODE_TYPE.dark;

    if (isDark) {
      document.body.classList.add(darkModeClassName);
    } else {
      document.body.classList.remove(darkModeClassName);
    }
  }, [themeMode, isDarkOnSystem]);
}

export function useThemeMode() {
  const themeMode = useRabbySelector((state) => state.preference.themeMode);

  const isDarkOnSystem = useIsDarkMode();

  return {
    isDarkTheme: !process.env.DEBUG
      ? false
      : themeMode === DARK_MODE_TYPE.dark || isDarkOnSystem,
  };
}
