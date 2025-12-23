import { useEffect } from 'react';
import { useWallet } from '../utils';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';

export const useSetReportGasLevel = (gasLevel?: GasLevel['level']) => {
  const wallet = useWallet();
  useEffect(() => {
    wallet.setReportGasLevel(gasLevel || 'normal').catch((e) => {
      console.error('useSetReportGasLevel setReportGasLevel error', e);
    });
  }, [gasLevel]);
};
