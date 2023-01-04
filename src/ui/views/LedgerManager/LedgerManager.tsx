import React from 'react';
import './index.less';
import { LedgerManagerStateProvider, StateProviderProps } from './utils';
import { Main } from './Main';
import { useWallet } from '@/ui/utils';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { Spin } from 'antd';

const LEDGER_TYPE = HARDWARE_KEYRING_TYPES.Ledger.type;

export const LedgerManager: React.FC<StateProviderProps> = () => {
  const wallet = useWallet();
  const [initialed, setInitialed] = React.useState(false);
  const idRef = React.useRef<number | null>(null);

  const closeConnect = React.useCallback(() => {
    wallet.requestKeyring(LEDGER_TYPE, 'cleanUp', idRef.current);
  }, []);

  React.useEffect(() => {
    wallet
      .connectHardware({
        type: LEDGER_TYPE,
        isWebHID: true,
      })
      .then((id) => {
        idRef.current = id;
        setInitialed(true);
      });

    window.addEventListener('beforeunload', () => {
      closeConnect();
    });

    return () => {
      closeConnect();
    };
  }, []);

  if (!initialed) {
    return (
      <div className="flex items-center justify-center w-screen h-screen">
        <Spin />
      </div>
    );
  }

  return (
    <LedgerManagerStateProvider keyringId={idRef.current}>
      <div className="LedgerManager">
        <Main />
      </div>
    </LedgerManagerStateProvider>
  );
};
