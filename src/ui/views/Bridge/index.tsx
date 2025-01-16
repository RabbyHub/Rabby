import React from 'react';
import { BridgeContent } from './Component/BridgeContent';
import {
  QuoteVisibleProvider,
  RefreshIdProvider,
  SettingVisibleProvider,
} from './hooks';
import clsx from 'clsx';
import { getUiType } from '@/ui/utils';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { withAccountChange } from '@/ui/utils/withAccountChange';
const isTab = getUiType().isTab;

const BridgeComponent = () => {
  const { isDarkTheme } = useThemeMode();
  return (
    <SettingVisibleProvider>
      <RefreshIdProvider>
        <QuoteVisibleProvider>
          <div
            className="h-full w-full flex flex-col items-center justify-center"
            style={{
              background: isDarkTheme
                ? 'linear-gradient(0deg, rgba(0, 0, 0, 0.50) 0%, rgba(0, 0, 0, 0.50) 100%), var(--r-blue-default, #7084FF)'
                : 'var(--r-blue-default, #7084FF)',
            }}
          >
            <div
              className={clsx(
                isTab
                  ? 'js-rabby-popup-container overflow-hidden relative w-[400px] h-[600px] translate-x-0'
                  : 'w-full h-full'
              )}
            >
              <div
                className={clsx(
                  'px-0 overflow-hidden bg-r-neutral-bg-2 h-full relative flex flex-col',
                  isTab
                    ? 'rounded-[16px] shadow-[0px_40px_80px_0px_rgba(43,57,143,0.40)'
                    : ''
                )}
              >
                <BridgeContent />
              </div>
            </div>
          </div>
        </QuoteVisibleProvider>
      </RefreshIdProvider>
    </SettingVisibleProvider>
  );
};

export const Bridge = isTab
  ? withAccountChange(BridgeComponent)
  : BridgeComponent;
