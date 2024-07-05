import React from 'react';
import { Header } from './Component/BridgeHeader';
import { BridgeContent } from './Component/BridgeContent';
import {
  QuoteVisibleProvider,
  RefreshIdProvider,
  SettingVisibleProvider,
} from './hooks';

export const Bridge = () => {
  return (
    <SettingVisibleProvider>
      <RefreshIdProvider>
        <QuoteVisibleProvider>
          <div className="px-0 overflow-hidden bg-r-neutral-bg-2 h-full relative flex flex-col">
            <Header />
            <BridgeContent />
          </div>
        </QuoteVisibleProvider>
      </RefreshIdProvider>
    </SettingVisibleProvider>
  );
};
