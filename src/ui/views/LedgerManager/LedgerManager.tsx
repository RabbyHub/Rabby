import React from 'react';
import './index.less';
import { LedgerManagerStateProvider, StateProviderProps } from './utils';
import { Main } from './Main';

export const LedgerManager: React.FC<StateProviderProps> = (props) => {
  return (
    <LedgerManagerStateProvider {...props}>
      <div className="LedgerManager">
        <Main />
      </div>
    </LedgerManagerStateProvider>
  );
};
