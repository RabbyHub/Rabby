import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemoizedFn } from 'ahooks';
import { message } from 'antd';
import { getPerpsSDK } from './sdkManager';
import { usePerpsState } from './usePerpsState';
import * as Sentry from '@sentry/browser';
import { sleep, useWallet } from '@/ui/utils';
import { PERPS_BUILDER_INFO } from './constants';
import { OrderResponse } from '@rabby-wallet/hyperliquid-sdk';

export const usePerpsPosition = ({
  setCurrentTpOrSl,
}: {
  setCurrentTpOrSl: (params: { tpPrice?: string; slPrice?: string }) => void;
}) => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const {
    userFills,
    currentPerpsAccount,
    isLogin,
    hasPermission,

    judgeIsUserAgentIsExpired,
  } = usePerpsState({});

  const logout = useMemoizedFn((address: string) => {
    dispatch.perps.logout();
    wallet.setPerpsCurrentAccount(null);
    wallet.setSendApproveAfterDeposit(address, []);
  });

  const handleSetAutoClose = useMemoizedFn(
    async (params: {
      coin: string;
      tpTriggerPx: string;
      slTriggerPx: string;
      direction: 'Long' | 'Short';
    }) => {
      try {
        const sdk = getPerpsSDK();
        const { coin, tpTriggerPx, slTriggerPx, direction } = params;
        const res = await sdk.exchange?.bindTpslByOrderId({
          coin,
          isBuy: direction === 'Long',
          tpTriggerPx,
          slTriggerPx,
          builder: PERPS_BUILDER_INFO,
        });

        setCurrentTpOrSl({
          tpPrice: tpTriggerPx,
          slPrice: slTriggerPx,
        });
        setTimeout(() => {
          dispatch.perps.fetchPositionOpenOrders();
        }, 1000);
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
        const isExpired = await judgeIsUserAgentIsExpired(error?.message || '');
        if (isExpired) {
          return;
        }
        message.error(error?.message || 'Set auto close error');
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
      try {
        const sdk = getPerpsSDK();
        const { coin, direction, price, size } = params;
        const res = await sdk.exchange?.marketOrderClose({
          coin,
          isBuy: direction === 'Short',
          size,
          midPx: price,
          builder: PERPS_BUILDER_INFO,
        });

        const filled = res?.response?.data?.statuses[0]?.filled;
        if (filled) {
          dispatch.perps.fetchClearinghouseState();
          dispatch.perps.fetchUserHistoricalOrders();
          const { totalSz, avgPx } = filled;
          message.success(
            `Closed ${direction} ${coin}-USD: Size ${totalSz} at Price $${avgPx}`
          );
          setCurrentTpOrSl({
            tpPrice: undefined,
            slPrice: undefined,
          });
          return res?.response?.data?.statuses[0]?.filled as {
            totalSz: string;
            avgPx: string;
            oid: number;
          };
        } else {
          const msg = res?.response?.data?.statuses[0]?.error;
          message.error(msg || 'close position error');
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
        const isExpired = await judgeIsUserAgentIsExpired(e?.message || '');
        if (isExpired) {
          return null;
        }
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

        const marketOrderPromise = sdk.exchange?.marketOrderOpen({
          coin,
          isBuy: direction === 'Long',
          size,
          midPx,
          // tpTriggerPx,
          // slTriggerPx,
        });

        const promises: Promise<OrderResponse | undefined>[] = [];

        if (marketOrderPromise) {
          promises.push(marketOrderPromise);
        }

        if (tpTriggerPx || slTriggerPx) {
          promises.push(
            (async () => {
              await sleep(10); // little delay to ensure nonce is correct
              return sdk.exchange?.bindTpslByOrderId({
                coin,
                isBuy: direction === 'Long',
                tpTriggerPx,
                slTriggerPx,
                builder: PERPS_BUILDER_INFO,
              });
            })()
          );
        }

        const results = await Promise.all(promises);
        const res = results[0];
        const filled = res?.response?.data?.statuses[0]?.filled;
        if (filled) {
          dispatch.perps.fetchClearinghouseState();

          const { totalSz, avgPx } = filled;
          message.success(
            `Opened ${direction} ${coin}-USD: Size ${totalSz} at Price $${avgPx}`
          );
          setCurrentTpOrSl({
            tpPrice: tpTriggerPx,
            slPrice: slTriggerPx,
          });
          return res?.response?.data?.statuses[0]?.filled as {
            totalSz: string;
            avgPx: string;
            oid: number;
          };
        } else {
          const msg = res?.response?.data?.statuses[0]?.error;
          message.error(msg || 'open position error');
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
        const isExpired = await judgeIsUserAgentIsExpired(error?.message || '');
        if (isExpired) {
          return;
        }
        console.error(error);
        message.error(error?.message || 'open position error');
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
    userFills,
    isLogin,
    currentPerpsAccount,
    hasPermission,
  };
};
