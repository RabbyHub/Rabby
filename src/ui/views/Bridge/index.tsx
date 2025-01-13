import React from 'react';
import { Header } from './Component/BridgeHeader';
import { BridgeContent } from './Component/BridgeContent';
import {
  QuoteVisibleProvider,
  RefreshIdProvider,
  SettingVisibleProvider,
} from './hooks';
import clsx from 'clsx';
import { getUiType } from '@/ui/utils';
const isTab = getUiType().isTab;

export const Bridge = () => {
  return (
    <SettingVisibleProvider>
      <RefreshIdProvider>
        <QuoteVisibleProvider>
          <div className="h-full w-full flex flex-col items-center justify-center bg-r-blue-default">
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
                <Header />
                <BridgeContent />
              </div>
            </div>
          </div>
        </QuoteVisibleProvider>
      </RefreshIdProvider>
    </SettingVisibleProvider>
  );
};
