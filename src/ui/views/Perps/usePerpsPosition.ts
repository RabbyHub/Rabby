import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemoizedFn } from 'ahooks';
import { message } from 'antd';
import { getPerpsSDK } from './sdkManager';
import { usePerpsState } from './usePerpsState';
import * as Sentry from '@sentry/browser';

export const usePerpsPosition = () => {
  const {
    refreshData,
    userFills,
    currentPerpsAccount,
    isLogin,
    hasPermission,
  } = usePerpsState({});

  const handleSetAutoClose = useMemoizedFn(
    async (params: {
      coin: string;
      tpTriggerPx: string;
      slTriggerPx: string;
      direction: 'Long' | 'Short';
    }) => {
      try {
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

        // if (
        //   res?.response.data.statuses.every(
        //     (item) => ((item as unknown) as string) === 'waitingForTrigger'
        //   )
        // ) {
        //   refreshData();
        //   message.success('Auto close position set successfully');
        // } else {
        //   message.error('Set auto close error');
        //   Sentry.captureException(
        //     new Error(
        //       'Set auto close error' +
        //         'params: ' +
        //         JSON.stringify(params) +
        //         'res: ' +
        //         JSON.stringify(res)
        //     )
        //   );
        // }
      } catch (error) {
        message.error('Set auto close error');
        Sentry.captureException(
          new Error(
            'Set auto close error' +
              'params: ' +
              JSON.stringify(params) +
              'error: ' +
              JSON.stringify(error)
          )
        );
      }
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
            `close ${direction} ${coin}, avgPrice: ${avgPx}, size: ${totalSz}`
          );
          return res?.response?.data?.statuses[0]?.filled as {
            totalSz: string;
            avgPx: string;
            oid: number;
          };
        } else {
          message.error('close position error');
          Sentry.captureException(
            new Error(
              'PERPS close position noFills' +
                'params: ' +
                JSON.stringify(params) +
                'res: ' +
                JSON.stringify(res)
            )
          );
          return null;
        }
      } catch (e) {
        console.error('close position error', e);
        message.error(e?.message || 'close position error');
        Sentry.captureException(
          new Error(
            'PERPS close position error' +
              'params: ' +
              JSON.stringify(params) +
              'error: ' +
              JSON.stringify(e)
          )
        );
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
            `open ${direction} ${coin}, avgPrice: ${avgPx}, size: ${totalSz}`
          );
          return res?.response?.data?.statuses[0]?.filled as {
            totalSz: string;
            avgPx: string;
            oid: number;
          };
        } else {
          message.error('open position error');
          Sentry.captureException(
            new Error(
              'PERPS open position noFills' +
                'params: ' +
                JSON.stringify(params) +
                'res: ' +
                JSON.stringify(res)
            )
          );
        }
      } catch (error) {
        console.error(error);
        message.error('open position error');
        Sentry.captureException(
          new Error(
            'PERPS open position error' +
              'params: ' +
              JSON.stringify(params) +
              'error: ' +
              JSON.stringify(error)
          )
        );
      }
    }
  );

  return {
    handleOpenPosition,
    handleClosePosition,
    handleSetAutoClose,
    refreshData,
    userFills,
    isLogin,
    currentPerpsAccount,
    hasPermission,
  };
};
