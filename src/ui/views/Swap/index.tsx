import React from 'react';
import { Header } from './Component/Header';
import { Main } from './Component/Main';
import {
  QuoteVisibleProvider,
  RefreshIdProvider,
  SettingVisibleProvider,
} from './hooks';

const Swap = () => {
  return (
    <SettingVisibleProvider>
      <RefreshIdProvider>
        <QuoteVisibleProvider>
          <div className="px-0 overflow-hidden bg-r-neutral-bg-2 h-full relative flex flex-col">
            <Header />
            <Main />
          </div>
        </QuoteVisibleProvider>
      </RefreshIdProvider>
    </SettingVisibleProvider>
  );
};
export default Swap;
