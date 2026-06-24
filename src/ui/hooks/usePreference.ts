import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
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

// The Perps pro page is always dark AND uses the unified Rabby red/green
// palette (scoped via the `perps-pro-theme` class toggled in useThemeModeOnMain).
function isPerpsProPage() {
  return (
    uiTypes.isDesktop &&
    !!window.location.hash?.split('?')[0]?.startsWith('#/desktop/perps')
  );
}

function isFinalDarkMode(themeMode: DARK_MODE_TYPE, isDarkOnSystem: boolean) {
  // The Perps pro page lives must be always dark.
  if (isPerpsProPage()) {
    return true;
  }

  const userSelectedDark = themeMode === DARK_MODE_TYPE.dark;
  const useSystemAndOnDark =
    themeMode === DARK_MODE_TYPE.system && isDarkOnSystem;

  if (process.env.DEBUG) {
    return userSelectedDark || useSystemAndOnDark;
  }

  if (uiTypes.isTab) {
    const hashValue = window.location.hash?.split('?')?.[0];

    return (
      userSelectedDark &&
      [
        '#/mnemonics/create',
        '#/import/mnemonics',

        '#/import/select-address',

        '#/pending-detail',

        '#/import/hardware/ledger-connect',
        '#/import/hardware/trezor-connect',
        '#/import/hardware/onekey',
        '#/import/hardware/keystone',
        '#/import/hardware/qrcode',

        '#/dapp-search',
        '#/approval-manage',

        '#/send-token',
        '#/dex-swap',
        '#/bridge',
      ].includes(hashValue)
    );
  }

  return userSelectedDark;
}

export function useThemeModeOnMain() {
  const dispatch = useRabbyDispatch();

  const themeMode = useRabbySelector((state) => state.preference.themeMode);

  const isDarkOnSystem = useIsDarkMode();

  const location = useLocation();

  useEffect(() => {
    (async () => {
      await dispatch.preference.getPreference('themeMode');
    })();
  }, [dispatch]);

  useLayoutEffect(() => {
    const isDark = isFinalDarkMode(themeMode, isDarkOnSystem);
    const root = document.documentElement;
    // Scope the unified Rabby red/green palette to the Perps pro page.
    root.classList.toggle('perps-pro-theme', isPerpsProPage());
    // Skip when the resolved theme already matches the DOM.
    if (isDark === root.classList.contains(darkModeClassName)) {
      return;
    }
    root.classList.add('no-transitions');
    if (isDark) {
      // see https://v2.tailwindcss.com/docs/dark-mode
      root.classList.add(darkModeClassName);
    } else {
      root.classList.remove(darkModeClassName);
    }

    requestAnimationFrame(() => {
      root.classList.remove('no-transitions');
    });
  }, [themeMode, isDarkOnSystem, location.pathname]);
}

export function useThemeMode() {
  const themeMode = useRabbySelector((state) => state.preference.themeMode);

  const isDarkOnSystem = useIsDarkMode();

  return {
    isDarkTheme: isFinalDarkMode(themeMode, isDarkOnSystem),
  };
}
