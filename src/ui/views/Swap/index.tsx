import React from 'react';
import { Main } from './Component/Main';
import {
  QuoteVisibleProvider,
  RabbyFeeProvider,
  RefreshIdProvider,
} from './hooks';
import clsx from 'clsx';
import { getUiType } from '@/ui/utils';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { withAccountChange } from '@/ui/utils/withAccountChange';
import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
const isTab = getUiType().isTab;

const Swap = () => {
  const { isDarkTheme } = useThemeMode();
  return (
    <RefreshIdProvider>
      <QuoteVisibleProvider>
        <RabbyFeeProvider>
          <FullscreenContainer>
            <div
              className={clsx(
                'px-0 overflow-hidden bg-r-neutral-bg-2 h-full relative flex flex-col',
                isTab
                  ? 'rounded-[16px] shadow-[0px_40px_80px_0px_rgba(43,57,143,0.40)'
                  : ''
              )}
            >
              <Main />
            </div>
          </FullscreenContainer>
        </RabbyFeeProvider>
      </QuoteVisibleProvider>
    </RefreshIdProvider>
  );
};
export default isTab ? withAccountChange(Swap) : Swap;
