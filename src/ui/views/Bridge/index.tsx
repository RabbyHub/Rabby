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
import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
const isTab = getUiType().isTab;

const BridgeComponent = () => {
  const { isDarkTheme } = useThemeMode();
  return (
    <SettingVisibleProvider>
      <RefreshIdProvider>
        <QuoteVisibleProvider>
          <FullscreenContainer>
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
          </FullscreenContainer>
        </QuoteVisibleProvider>
      </RefreshIdProvider>
    </SettingVisibleProvider>
  );
};

export const Bridge = isTab
  ? withAccountChange(BridgeComponent)
  : BridgeComponent;
