import React from 'react';
import { Header } from './Component/Header';
import { Main } from './Component/Main';
import {
  QuoteVisibleProvider,
  RabbyFeeVisibleProvider,
  RefreshIdProvider,
} from './hooks';

const Swap = () => {
  return (
    <RefreshIdProvider>
      <QuoteVisibleProvider>
        <RabbyFeeVisibleProvider>
          <div className="px-0 overflow-hidden bg-r-neutral-bg-2 h-full relative flex flex-col">
            <Header />
            <Main />
          </div>
        </RabbyFeeVisibleProvider>
      </QuoteVisibleProvider>
    </RefreshIdProvider>
  );
};
export default Swap;
