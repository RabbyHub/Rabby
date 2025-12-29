import { sleep, useWallet } from '@/ui/utils';
import { getPerpsSDK } from '../../Perps/sdkManager';
import {
  PERPS_BUILDER_INFO,
  PERPS_BUILDER_INFO_PRO,
} from '../../Perps/constants';
import { OrderResponse, PlaceOrderParams } from '@rabby-wallet/hyperliquid-sdk';
import { message } from 'antd';
import * as Sentry from '@sentry/browser';
import { useMemoizedFn } from 'ahooks';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { LimitOrderType } from '../types';
import { removeTrailingZeros } from '../components/TradingPanel/utils';
import BigNumber from 'bignumber.js';
import { formatTpOrSlPrice } from '../../Perps/utils';

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

  const calculateScaleOrdersWithSkew = useMemoizedFn(
    ({
      coin,
      szDecimals,
      isBuy,
      totalSize,
      startPrice,
      endPrice,
      numGrids,
      sizeSkew = 1.0,
      reduceOnly = false,
      limitOrderType = 'Gtc',
    }: {
      coin: string;
      szDecimals: number;
      isBuy: boolean;
      totalSize: string;
      startPrice: string;
      endPrice: string;
      numGrids: number;
      sizeSkew: number;
      reduceOnly: boolean;
      limitOrderType: LimitOrderType;
    }) => {
      if (numGrids <= 0) {
        throw new Error('numGrids must be greater than 0');
      }

      if (Number(startPrice) === Number(endPrice)) {
        throw new Error('startPrice and endPrice must be different');
      }

      if (numGrids === 1) {
        return [
          {
            coin,
            isBuy,
            sz: totalSize,
            limitPx: startPrice,
            reduceOnly,
            orderType: {
              limit: {
                tif: limitOrderType,
              },
            },
            builder: PERPS_BUILDER_INFO_PRO,
          },
        ];
      }

      const ordersToSubmit: PlaceOrderParams[] = [];
      const totalSizeBN = new BigNumber(totalSize);
      const startPriceBN = new BigNumber(startPrice);
      const endPriceBN = new BigNumber(endPrice);
      const numGridsBN = new BigNumber(numGrids);
      const sizeSkewBN = new BigNumber(sizeSkew);

      if (totalSizeBN.lte(0)) {
        throw new Error('totalSize must be greater than 0');
      }
      if (startPriceBN.lte(0) || endPriceBN.lte(0)) {
        throw new Error('startPrice and endPrice must be greater than 0');
      }
      if (sizeSkewBN.lte(0)) {
        throw new Error('sizeSkew must be greater than 0');
      }

      // priceRange: priceRange = endPrice - startPrice
      const priceRange = endPriceBN.minus(startPriceBN);
      // priceStep: price_step = priceRange / (numGrids - 1)
      const priceStep = priceRange.dividedBy(numGridsBN.minus(1));

      // firstSize: size_1
      let firstSize: string;
      let commonSizeDiff: string;

      if (sizeSkewBN.isEqualTo(1)) {
        // firstSize: size_1 = totalSize / numGrids
        firstSize = totalSizeBN
          .dividedBy(numGridsBN)
          .toFixed(szDecimals, BigNumber.ROUND_DOWN);
        commonSizeDiff = '0';
      } else {
        // firstSize: size_1 = totalSize / [numGrids * (1 + (sizeSkew - 1) / 2)]
        // arithmetic sequence sum formula: S_N = N * size_1 + N(N-1)/2 * d
        // 且 d = (S - 1) * V_1 / (N - 1)

        // solve size_1:
        // totalSize = N * size_1 + (N*(N-1)/2) * ( (sizeSkew - 1) * size_1 / (N - 1) )
        // totalSize = size_1 * [ N + (sizeSkew - 1) * N / 2 ]
        // totalSize = size_1 * N * [ 1 + (sizeSkew - 1) / 2 ]
        const denominator = numGridsBN.multipliedBy(
          new BigNumber(1).plus(sizeSkewBN.minus(1).dividedBy(2))
        );
        firstSize = totalSizeBN
          .dividedBy(denominator)
          .toFixed(szDecimals, BigNumber.ROUND_DOWN);

        // commonSizeDiff: d = (size_skew - 1) * size_1 / (numGrids - 1)
        const firstSizeBN = new BigNumber(firstSize);
        const numerator = sizeSkewBN.minus(1).multipliedBy(firstSizeBN);
        commonSizeDiff = numerator
          .dividedBy(numGridsBN.minus(1))
          .toFixed(szDecimals, BigNumber.ROUND_DOWN);
      }

      let checkTotalSize = new BigNumber(0);
      const firstSizeBN = new BigNumber(firstSize);
      const commonSizeDiffBN = new BigNumber(commonSizeDiff);

      for (let i = 0; i < numGrids; i++) {
        const iBN = new BigNumber(i);

        // price: price_i = price_1 + i * price_step
        const price = startPriceBN.plus(iBN.multipliedBy(priceStep));

        // size: size_i = size_1 + i * d
        let size: string;

        if (i === numGrids - 1) {
          size = totalSizeBN
            .minus(checkTotalSize)
            .toFixed(szDecimals, BigNumber.ROUND_DOWN);
        } else {
          size = firstSizeBN
            .plus(iBN.multipliedBy(commonSizeDiffBN))
            .toFixed(szDecimals, BigNumber.ROUND_DOWN);
        }

        const order = {
          coin,
          isBuy,
          sz: size,
          limitPx: formatTpOrSlPrice(price.toNumber(), szDecimals),
          reduceOnly,
          orderType: {
            limit: {
              tif: limitOrderType,
            },
          },
          builder: PERPS_BUILDER_INFO_PRO,
        };
        ordersToSubmit.push(order);
        checkTotalSize = checkTotalSize.plus(new BigNumber(order.sz));
      }

      console.log(
        `网格计算完成。起始价量: ${ordersToSubmit[0].sz}, 终点价量: ${
          ordersToSubmit[numGrids - 1].sz
        }`
      );
      const startSizeBN = new BigNumber(ordersToSubmit[0].sz);
      const endSizeBN = new BigNumber(ordersToSubmit[numGrids - 1].sz);
      console.log(
        `理论倾斜比 (V_end / V_start): ${endSizeBN
          .dividedBy(startSizeBN)
          .toFixed()}`
      );
      console.log(`实际倾斜比: ${sizeSkew}`);

      return ordersToSubmit;
    }
  );

  const handleOpenScaleOrder = useMemoizedFn(
    async (params: {
      coin: string;
      totalSize: string;
      isBuy: boolean;
      orders: PlaceOrderParams[];
    }) => {
      try {
        const sdk = getPerpsSDK();
        const { coin, isBuy, totalSize, orders } = params;

        const res = await sdk.exchange?.multiOrder({
          orders,
          grouping: 'na',
          builder: PERPS_BUILDER_INFO_PRO,
        });
        const oid = res?.response?.data?.statuses[0]?.resting?.oid;
        if (oid) {
          message.success({
            duration: 1.5,
            content: t('page.perps.toast.openScaleOrderSuccess', {
              direction: isBuy ? 'Long' : 'Short',
              coin,
              size: totalSize,
            }),
          });
          return oid;
        } else {
          const msg =
            res?.response?.data?.statuses[0]?.error || 'open scale order error';
          message.error({
            duration: 1.5,
            content: String(msg) || 'open scale order error',
          });
          Sentry.captureException(
            new Error(
              'PERPS open scale order error' +
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
          content: error?.message || 'open scale order error',
        });
        Sentry.captureException(
          new Error(
            'PERPS open scale order error' +
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
    handleOpenMarketOrder,
    handleOpenLimitOrder,
    handleOpenTPSlMarketOrder,
    handleOpenTPSlLimitOrder,
    handleOpenTWAPOrder,
    handleOpenScaleOrder,
    calculateScaleOrdersWithSkew,
  };
};
