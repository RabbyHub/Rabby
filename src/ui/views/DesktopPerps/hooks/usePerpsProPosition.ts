import { sleep, useWallet } from '@/ui/utils';
import { getPerpsSDK } from '../../Perps/sdkManager';
import {
  PERPS_BUILDER_INFO,
  PERPS_BUILDER_INFO_PRO,
} from '../../Perps/constants';
import { OrderResponse } from '@rabby-wallet/hyperliquid-sdk';
import { message } from 'antd';
import * as Sentry from '@sentry/browser';
import { useMemoizedFn } from 'ahooks';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { LimitOrderType } from '../types';
import { removeTrailingZeros } from '../components/TradingPanel/utils';

const formatTriggerPx = (px?: string) => {
  // avoid '.15' input error from hy validator
  // '.15' -> '0.15'
  return px ? Number(px).toString() : undefined;
};

export const usePerpsProPosition = () => {
  const currentPerpsAccount = useRabbySelector(
    (state) => state.perps.currentPerpsAccount
  );
  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();

  const judgeIsUserAgentIsExpired = useMemoizedFn(
    async (errorMessage: string) => {
      const masterAddress = currentPerpsAccount?.address;
      if (!masterAddress) {
        return false;
      }

      const agentWalletPreference = await wallet.getAgentWalletPreference(
        masterAddress
      );
      const agentAddress = agentWalletPreference?.agentAddress;
      if (agentAddress && errorMessage.includes(agentAddress)) {
        console.warn('handle action agent is expired, logout');
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: 'Agent is expired, please login again',
        });
        dispatch.perps.setAccountNeedApproveAgent(true);
        return true;
      }
    }
  );

  const handleOpenMarketOrder = useMemoizedFn(
    async (params: {
      coin: string;
      isBuy: boolean;
      size: string;
      midPx: string;
      tpTriggerPx?: string;
      slTriggerPx?: string;
      reduceOnly?: boolean;
    }) => {
      try {
        const sdk = getPerpsSDK();
        const {
          coin,
          isBuy,
          size,
          midPx,
          tpTriggerPx,
          slTriggerPx,
          reduceOnly,
        } = params;
        const formattedTpTriggerPx = formatTriggerPx(tpTriggerPx);
        const formattedSlTriggerPx = formatTriggerPx(slTriggerPx);

        const results = await sdk.exchange?.marketOrderOpen({
          coin,
          isBuy,
          size,
          midPx,
          reduceOnly,
          tpTriggerPx: formattedTpTriggerPx,
          slTriggerPx: formattedSlTriggerPx,
          builder: PERPS_BUILDER_INFO_PRO,
        });
        const filled = results?.response?.data?.statuses[0]?.filled;
        if (filled) {
          const { totalSz, avgPx } = filled;
          message.success({
            duration: 1.5,
            content: t('page.perps.toast.openPositionSuccess', {
              direction: isBuy ? 'Long' : 'Short',
              coin,
              size: totalSz,
              price: avgPx,
            }),
          });
          return results?.response?.data?.statuses[0]?.filled as {
            totalSz: string;
            avgPx: string;
            oid: number;
          };
        } else {
          const msg = results?.response?.data?.statuses[0]?.error;
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: msg || 'open position error',
          });
          Sentry.captureException(
            new Error(
              'PERPS open position noFills' +
                'params: ' +
                JSON.stringify(params) +
                'res: ' +
                JSON.stringify(results)
            )
          );
        }
      } catch (error) {
        const isExpired = await judgeIsUserAgentIsExpired(error?.message || '');
        if (isExpired) {
          return;
        }
        console.error(error);
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: error?.message || 'open position error',
        });
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

  const handleOpenLimitOrder = useMemoizedFn(
    async (params: {
      coin: string;
      isBuy: boolean;
      size: string;
      limitPx: string;
      tpTriggerPx?: string;
      slTriggerPx?: string;
      reduceOnly?: boolean;
      orderType?: LimitOrderType;
    }) => {
      try {
        const sdk = getPerpsSDK();
        const {
          coin,
          isBuy,
          size,
          limitPx,
          tpTriggerPx,
          slTriggerPx,
          reduceOnly,
          orderType = 'Gtc',
        } = params;
        const promises = [
          sdk.exchange?.placeOrder({
            coin,
            isBuy,
            sz: removeTrailingZeros(size),
            limitPx: removeTrailingZeros(limitPx),
            reduceOnly,
            orderType: {
              limit: {
                tif: orderType,
              },
            },
            builder: PERPS_BUILDER_INFO_PRO,
          }),
        ];

        const formattedTpTriggerPx = formatTriggerPx(tpTriggerPx);
        const formattedSlTriggerPx = formatTriggerPx(slTriggerPx);

        if (tpTriggerPx || slTriggerPx) {
          promises.push(
            (async () => {
              await sleep(10); // little delay to ensure nonce is correct

              const result = await sdk.exchange?.bindTpslByOrderId({
                coin,
                isBuy,
                tpTriggerPx: formattedTpTriggerPx,
                slTriggerPx: formattedSlTriggerPx,
                builder: PERPS_BUILDER_INFO_PRO,
              });
              return result as OrderResponse;
            })()
          );
        }

        const results = await Promise.all(promises);
        const res = results[0];
        const resting = res?.response?.data?.statuses[0]?.resting;
        if (resting?.oid) {
          message.success({
            duration: 1.5,
            content: t('page.perps.toast.openLimitOrderSuccess', {
              direction: isBuy ? 'Long' : 'Short',
              coin,
              size: size,
              price: limitPx,
            }),
          });
          return resting?.oid;
        } else {
          const msg = res?.response?.data?.statuses[0]?.error;
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: msg || 'open limit order error',
          });
          Sentry.captureException(
            new Error(
              'PERPS open limit order error' +
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
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: error?.message || 'open limit order error',
        });
        Sentry.captureException(
          new Error(
            'PERPS open limit order error' +
              'params: ' +
              JSON.stringify(params) +
              'error: ' +
              JSON.stringify(error)
          )
        );
      }
    }
  );

  const handleOpenTPSlMarketOrder = useMemoizedFn(
    async (params: {
      coin: string;
      isBuy: boolean;
      size: string;
      triggerPx: string;
      reduceOnly: boolean;
      tpsl: 'tp' | 'sl';
    }) => {
      try {
        const sdk = getPerpsSDK();
        const { coin, isBuy, size, triggerPx, reduceOnly } = params;
        const res = await sdk.exchange?.placeTPSlMarketOrder({
          coin,
          isBuy,
          size,
          triggerPx,
          reduceOnly,
          tpsl: params.tpsl,
          builder: PERPS_BUILDER_INFO_PRO,
        });
        const resting = res?.response?.data?.statuses[0]?.resting;
        if (resting?.oid) {
          message.success({
            duration: 1.5,
            content: t('page.perps.toast.openTPSlMarketOrderSuccess', {
              tpsl: params.tpsl === 'tp' ? 'Take profit' : 'Stop loss',
              direction: isBuy ? 'Long' : 'Short',
              coin,
              size: size,
              price: triggerPx,
            }),
          });
          return resting?.oid;
        } else {
          const msg = res?.response?.data?.statuses[0]?.error;
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: msg || 'open tp or sl market order error',
          });
          Sentry.captureException(
            new Error(
              'PERPS open tp or sl market order error' +
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
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: error?.message || 'open tp or sl market order error',
        });
        Sentry.captureException(
          new Error(
            'PERPS open tp or sl market order error' +
              'params: ' +
              JSON.stringify(params) +
              'error: ' +
              JSON.stringify(error)
          )
        );
      }
    }
  );

  const handleOpenTPSlLimitOrder = useMemoizedFn(
    async (params: {
      coin: string;
      isBuy: boolean;
      size: string;
      triggerPx: string;
      reduceOnly: boolean;
      limitPx: string;
      tpsl: 'tp' | 'sl';
    }) => {
      try {
        const sdk = getPerpsSDK();
        const { coin, isBuy, size, triggerPx, reduceOnly, limitPx } = params;
        const res = await sdk.exchange?.placeTPSlLimitOrder({
          coin,
          isBuy,
          size,
          limitPx,
          reduceOnly,
          triggerPx,
          tpsl: params.tpsl,
          builder: PERPS_BUILDER_INFO_PRO,
        });
        const resting = res?.response?.data?.statuses[0]?.resting;
        if (resting?.oid) {
          message.success({
            duration: 1.5,
            content: t('page.perps.toast.openTPSlLimitOrderSuccess', {
              tpsl: params.tpsl === 'tp' ? 'Take profit' : 'Stop loss',
              direction: isBuy ? 'Long' : 'Short',
              coin,
              size: size,
              price: triggerPx,
            }),
          });
          return resting?.oid;
        } else {
          const msg = res?.response?.data?.statuses[0]?.error;
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: msg || 'open tp or sl limit order error',
          });
          Sentry.captureException(
            new Error(
              'PERPS open tp or sl limit order error' +
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
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: error?.message || 'open tp or sl limit order error',
        });
        Sentry.captureException(
          new Error(
            'PERPS open tp or sl limit order error' +
              'params: ' +
              JSON.stringify(params) +
              'error: ' +
              JSON.stringify(error)
          )
        );
      }
    }
  );

  const handleOpenTWAPOrder = useMemoizedFn(
    async (params: {
      coin: string;
      isBuy: boolean;
      size: string;
      reduceOnly: boolean;
      durationMins: number;
      randomizeDelay: boolean;
    }) => {
      try {
        const sdk = getPerpsSDK();
        const {
          coin,
          isBuy,
          size,
          reduceOnly,
          durationMins,
          randomizeDelay,
        } = params;
        const res = await sdk.exchange?.placeTwapOrder({
          coin,
          isBuy,
          sz: removeTrailingZeros(size),
          reduceOnly,
          durationMins,
          randomizeDelay,
          // builder: PERPS_BUILDER_INFO_PRO,
          // add builder params is error by hyperliquid backend
        });
        const twapId = res?.response?.data?.statuses?.running?.twapId;
        if (twapId) {
          message.success({
            duration: 1.5,
            content: t('page.perps.toast.openTWAPOrderSuccess', {
              direction: isBuy ? 'Long' : 'Short',
              coin,
              size: size,
            }),
          });
          return twapId;
        } else {
          const msg = res?.response?.data?.error || 'open twap order error';
          message.error({
            duration: 1.5,
            content: String(msg) || 'open twap order error',
          });
          Sentry.captureException(
            new Error(
              'PERPS open twap order error' +
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
        message.error({
          duration: 1.5,
          content: error?.message || 'open twap order error',
        });
        Sentry.captureException(
          new Error(
            'PERPS open twap order error' +
              'params: ' +
              JSON.stringify(params) +
              'error: ' +
              JSON.stringify(error)
          )
        );
      }
    }
  );

  // todo
  const handleCloseWithLimitOrder = handleOpenLimitOrder;

  const handleCloseWithMarketOrder = useMemoizedFn(
    async (params: {
      coin: string;
      size: string;
      midPx: string;
      isBuy: boolean;
      reduceOnly?: boolean;
    }) => {
      try {
        const sdk = getPerpsSDK();
        const { coin, isBuy, midPx, size, reduceOnly } = params;
        const res = await sdk.exchange?.marketOrderClose({
          coin,
          isBuy,
          size,
          midPx: midPx,
          builder: PERPS_BUILDER_INFO,
          reduceOnly: reduceOnly,
        });

        const filled = res?.response?.data?.statuses[0]?.filled;
        if (filled) {
          const { totalSz, avgPx } = filled;
          message.success({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: t('page.perps.toast.closePositionSuccess', {
              direction: isBuy ? 'Long' : 'Short',
              coin,
              size: totalSz,
              price: avgPx,
            }),
          });
          return res?.response?.data?.statuses[0]?.filled as {
            totalSz: string;
            avgPx: string;
            oid: number;
          };
        } else {
          const msg = res?.response?.data?.statuses[0]?.error;
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: msg || 'close position error',
          });
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
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: e?.message || 'close position error',
        });
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

  return {
    handleCloseWithLimitOrder,
    handleCloseWithMarketOrder,
    handleOpenMarketOrder,
    handleOpenLimitOrder,
    handleOpenTPSlMarketOrder,
    handleOpenTPSlLimitOrder,
    handleOpenTWAPOrder,
  };
};
