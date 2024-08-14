import React from 'react';
import { Header } from './Component/Header';
import { Main } from './Component/Main';
import {
  QuoteVisibleProvider,
  RabbyFeeProvider,
  RefreshIdProvider,
} from './hooks';
import { SilentApproval } from '../Approval/components/SilentSignTx';

const Swap = () => {
  return (
    <>
      <RefreshIdProvider>
        <QuoteVisibleProvider>
          <RabbyFeeProvider>
            <div className="px-0 overflow-hidden bg-r-neutral-bg-2 h-full relative flex flex-col">
              <Header />
              <Main />
            </div>
          </RabbyFeeProvider>
        </QuoteVisibleProvider>
      </RefreshIdProvider>
      <SilentApproval />
    </>
  );
};
export default Swap;
