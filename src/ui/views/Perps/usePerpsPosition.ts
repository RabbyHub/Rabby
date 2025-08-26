import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemoizedFn } from 'ahooks';
import { message } from 'antd';
import { getPerpsSDK } from './sdkManager';
import { usePerpsState } from './usePerpsState';

export const usePerpsPosition = () => {
  const { refreshData, userFills, currentPerpsAccount } = usePerpsState();

  const handleSetAutoClose = useMemoizedFn(
    async (params: {
      coin: string;
      tpTriggerPx: string;
      slTriggerPx: string;
      direction: 'Long' | 'Short';
    }) => {
      console.log('handleSetAutoClose', params);
      const sdk = getPerpsSDK();
      const { coin, tpTriggerPx, slTriggerPx, direction } = params;
      const res = await sdk.exchange?.bindTpslByOrderId({
        coin,
        isBuy: direction === 'Long',
        tpTriggerPx,
        slTriggerPx,
      });

      refreshData();
      message.success('Auto close position set successfully');
    }
  );

  const handleClosePosition = useMemoizedFn(
    async (params: {
      coin: string;
      size: string;
      price: string;
      direction: 'Long' | 'Short';
    }) => {
      console.log('handleClosePosition', params);
      try {
        const sdk = getPerpsSDK();
        const { coin, direction, price, size } = params;
        const res = await sdk.exchange?.marketOrderClose({
          coin,
          isBuy: direction === 'Short',
          size,
          midPx: price,
        });

        const filled = res?.response?.data?.statuses[0]?.filled;
        if (filled) {
          refreshData();
          const { totalSz, avgPx } = filled;
          message.success(
            `close ${direction} ${coin}, avgPx: ${avgPx}, size: ${totalSz}`
          );
          return res?.response?.data?.statuses[0]?.filled as {
            totalSz: string;
            avgPx: string;
            oid: number;
          };
        } else {
          message.error('close position error');
          return null;
        }
      } catch (e) {
        console.error(e);
        message.error('close position error');
        return null;
      }
    }
  );

  const handleOpenPosition = useMemoizedFn(
    async (params: {
      coin: string;
      size: string;
      leverage: number;
      direction: 'Long' | 'Short';
      midPx: string;
      tpTriggerPx?: string;
      slTriggerPx?: string;
    }) => {
      try {
        const sdk = getPerpsSDK();
        const {
          coin,
          leverage,
          direction,
          size,
          midPx,
          tpTriggerPx,
          slTriggerPx,
        } = params;
        await sdk.exchange?.updateLeverage({
          coin,
          leverage,
          isCross: false,
        });

        const res = await sdk.exchange?.marketOrderOpen({
          coin,
          isBuy: direction === 'Long',
          size,
          midPx,
          tpTriggerPx,
          slTriggerPx,
        });

        const filled = res?.response?.data?.statuses[0]?.filled;
        if (filled) {
          refreshData();
          const { totalSz, avgPx } = filled;
          message.success(
            `open ${direction} ${coin}, avgPx: ${avgPx}, size: ${totalSz}`
          );
          return res?.response?.data?.statuses[0]?.filled as {
            totalSz: string;
            avgPx: string;
            oid: number;
          };
        } else {
          message.error('open position error');
        }
      } catch (error) {
        console.error(error);
        message.error('open position error');
      }
    }
  );

  return {
    handleOpenPosition,
    handleClosePosition,
    handleSetAutoClose,
    refreshData,
    userFills,
    currentPerpsAccount,
  };
};
