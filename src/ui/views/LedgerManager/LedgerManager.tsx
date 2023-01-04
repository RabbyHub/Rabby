import React from 'react';
import './index.less';
import { LedgerManagerStateProvider } from './utils';
import { Main } from './Main';

export const LedgerManager: React.FC = () => {
  return (
    <LedgerManagerStateProvider>
      <div className="LedgerManager">
        <Main />
      </div>
    </LedgerManagerStateProvider>
  );
};
