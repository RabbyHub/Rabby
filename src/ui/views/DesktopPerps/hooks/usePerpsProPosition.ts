import { sleep, useWallet } from '@/ui/utils';
import { playSound } from '@/ui/utils/sound';
import { getPerpsSDK } from '../../Perps/sdkManager';
import {
  PERPS_BUILDER_INFO,
  PERPS_BUILDER_INFO_PRO,
} from '../../Perps/constants';
import {
  ClearinghouseState,
  CancelOrderParams,
  OrderResponse,
  PlaceOrderParams,
  SLIPPAGE,
} from '@rabby-wallet/hyperliquid-sdk';
import { perpsToast } from '../components/PerpsToast';
import * as Sentry from '@sentry/browser';
import { useMemoizedFn } from 'ahooks';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { LimitOrderType, MarginMode } from '../types';
import { removeTrailingZeros } from '../components/TradingPanel/utils';
import BigNumber from 'bignumber.js';
import { formatTpOrSlPrice } from '../../Perps/utils';
import { usePerpsProState } from './usePerpsProState';
import { useMemo } from 'react';

const formatTriggerPx = (px?: string) => {
  // avoid '.15' input error from hy validator
  // '.15' -> '0.15'
  return px ? Number(px).toString() : undefined;
};

export const usePerpsProPosition = () => {
  const currentPerpsAccount = useRabbySelector(
    (state) => state.perps.currentPerpsAccount
  );
  const { handleActionApproveStatus, needEnableTrading } = usePerpsProState();
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
        perpsToast.error({
          title: 'Agent is expired, please login again',
          // description: 'Agent is expired, please login again',
        });
        dispatch.perps.setAccountNeedApproveAgent(true);
        return true;
      }
    }
  );

  const playOrderFilledSound = () => {
    playSound('/sounds/order-filled.mp3');
  };

  // Generic error handler wrapper
  const withErrorHandler = useMemoizedFn(
    async <T, P>(
      operation: (params: P) => Promise<T>,
      params: P,
      errorMessage: string
    ): Promise<T | undefined> => {
      try {
        await handleActionApproveStatus();
        return await operation(params);
      } catch (error) {
        const isExpired = await judgeIsUserAgentIsExpired(error?.message || '');
        if (isExpired) {
          return;
        }
        console.error('PERPS', errorMessage, error);
        perpsToast.error({
          title: errorMessage,
          description: error?.message,
        });
        Sentry.captureException(
          new Error(
            `PERPS ${errorMessage} ` +
              'params: ' +
              JSON.stringify(params) +
              'error: ' +
              JSON.stringify(error)
          )
        );
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
      slippage?: number;
    }) => {
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const {
            coin,
            isBuy,
            size,
            midPx,
            tpTriggerPx,
            slTriggerPx,
            reduceOnly,
            slippage,
          } = p;
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
            slippage,
          });
          const filled = results?.response?.data?.statuses[0]?.filled;
          if (filled) {
            const { totalSz, avgPx } = filled;

            // Play success sound effect when order is filled
            playOrderFilledSound();

            perpsToast.success({
              title: t('page.perps.toast.orderFilled'),
              description: t('page.perps.toast.openPositionSuccess', {
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
            throw new Error(msg || 'open position error');
          }
        },
        params,
        'open position error'
      );
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
      return withErrorHandler(
        async (p) => {
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
          } = p;
          const res = await sdk.exchange?.limitOrderOpen({
            coin,
            isBuy,
            size,
            limitPx,
            reduceOnly,
            tpTriggerPx,
            slTriggerPx,
            tif: orderType,
            builder: PERPS_BUILDER_INFO_PRO,
          });
          const resting = res?.response?.data?.statuses[0]?.resting;
          const filled = res?.response?.data?.statuses[0]?.filled;
          if (resting || filled) {
            if (filled) {
              const { totalSz, avgPx } = filled;
              playOrderFilledSound();
              perpsToast.success({
                title: t('page.perps.toast.orderFilled'),
                description: t('page.perps.toast.openPositionSuccess', {
                  direction: isBuy ? 'Long' : 'Short',
                  coin,
                  size: totalSz,
                  price: avgPx,
                }),
              });
            } else {
              perpsToast.success({
                title: t('page.perps.toast.orderPlaced'),
                description: t('page.perps.toast.openLimitOrderSuccess', {
                  direction: isBuy ? 'Long' : 'Short',
                  coin,
                  size: size,
                  price: limitPx,
                }),
              });
            }
            return resting?.oid || filled?.oid;
          } else {
            const msg = res?.response?.data?.statuses[0]?.error;
            throw new Error(msg || 'open limit order error');
          }
        },
        params,
        'open limit order error'
      );
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
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const { coin, isBuy, size, triggerPx, reduceOnly } = p;
          const res = await sdk.exchange?.placeTPSlMarketOrder({
            coin,
            isBuy,
            size,
            triggerPx,
            reduceOnly,
            tpsl: p.tpsl,
            builder: PERPS_BUILDER_INFO_PRO,
          });
          const resting = res?.response?.data?.statuses[0]?.resting;
          if (resting?.oid) {
            perpsToast.success({
              title: t('page.perps.toast.orderPlaced'),
              description: t('page.perps.toast.openTPSlMarketOrderSuccess', {
                tpsl: p.tpsl === 'tp' ? 'Take profit' : 'Stop loss',
                direction: isBuy ? 'Long' : 'Short',
                coin,
                size: size,
                price: triggerPx,
              }),
            });
            return resting?.oid;
          } else {
            const msg = res?.response?.data?.statuses[0]?.error;
            throw new Error(msg || 'open tp or sl market order error');
          }
        },
        params,
        'open tp or sl market order error'
      );
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
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const { coin, isBuy, size, triggerPx, reduceOnly, limitPx } = p;
          const res = await sdk.exchange?.placeTPSlLimitOrder({
            coin,
            isBuy,
            size,
            limitPx,
            reduceOnly,
            triggerPx,
            tpsl: p.tpsl,
            builder: PERPS_BUILDER_INFO_PRO,
          });
          const resting = res?.response?.data?.statuses[0]?.resting;
          if (resting?.oid) {
            perpsToast.success({
              title: t('page.perps.toast.orderPlaced'),
              description: t('page.perps.toast.openTPSlLimitOrderSuccess', {
                tpsl: p.tpsl === 'tp' ? 'Take profit' : 'Stop loss',
                direction: isBuy ? 'Long' : 'Short',
                coin,
                size: size,
                price: triggerPx,
              }),
            });
            return resting?.oid;
          } else {
            const msg = res?.response?.data?.statuses[0]?.error;
            throw new Error(msg || 'open tp or sl limit order error');
          }
        },
        params,
        'open tp or sl limit order error'
      );
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
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const {
            coin,
            isBuy,
            size,
            reduceOnly,
            durationMins,
            randomizeDelay,
          } = p;
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
          const twapId = res?.response?.data?.status?.running?.twapId;
          if (twapId) {
            perpsToast.success({
              title: t('page.perps.toast.orderPlaced'),
              description: t('page.perps.toast.openTWAPOrderSuccess', {
                direction: isBuy ? 'Long' : 'Short',
                coin,
                size: size,
              }),
            });
            return twapId;
          } else {
            const msg = res?.response?.data?.error || 'open twap order error';
            throw new Error(msg || 'open twap order error');
          }
        },
        params,
        'open twap order error'
      );
    }
  );

  const handleCancelTWAPOrder = useMemoizedFn(
    async (params: { coin: string; twapId: number }) => {
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const { coin, twapId } = p;
          const res = await sdk.exchange?.cancelTwapOrder({ coin, twapId });
          if (res?.response?.data.status === 'success') {
            perpsToast.info({
              title: t('page.perps.toast.terminalTwap'),
              description: t('page.perps.toast.terminalTwapSuccess'),
            });
            return true;
          }
        },
        params,
        'cancel twap order error'
      );
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
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const { coin, isBuy, totalSize, orders } = p;

          const res = await sdk.exchange?.multiOrder({
            orders,
            grouping: 'na',
            builder: PERPS_BUILDER_INFO_PRO,
          });
          const oid = res?.response?.data?.statuses[0]?.resting?.oid;
          if (oid) {
            perpsToast.success({
              title: t('page.perps.toast.orderPlaced'),
              description: t('page.perps.toast.openScaleOrderSuccess', {
                direction: isBuy ? 'Long' : 'Short',
                coin,
                size: totalSize,
              }),
            });
            return oid;
          } else {
            const msg =
              res?.response?.data?.statuses[0]?.error ||
              'open scale order error';
            throw new Error(msg || 'open scale order error');
          }
        },
        params,
        'open scale order error'
      );
    }
  );

  const handleCloseWithMarketOrder = useMemoizedFn(
    async (params: {
      coin: string;
      size: string;
      midPx: string;
      isBuy: boolean;
      reduceOnly?: boolean;
    }) => {
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const { coin, isBuy, midPx, size, reduceOnly } = p;
          const res = await sdk.exchange?.marketOrderClose({
            coin,
            isBuy,
            size,
            midPx: midPx,
            builder: PERPS_BUILDER_INFO_PRO,
            reduceOnly: reduceOnly,
          });

          const filled = res?.response?.data?.statuses[0]?.filled;
          if (filled) {
            const { totalSz, avgPx } = filled;
            playOrderFilledSound();
            perpsToast.success({
              title: t('page.perps.toast.orderFilled'),
              description: t('page.perps.toast.closePositionSuccess', {
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
            throw new Error(msg || 'close position error');
          }
        },
        params,
        'close position error'
      );
    }
  );

  const handleCloseAllPositions = useMemoizedFn(
    async (clearinghouseState: ClearinghouseState) => {
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const res = await sdk.exchange?.closeAllPositions(
            p,
            0.08,
            PERPS_BUILDER_INFO_PRO
          );
          if (res?.response?.data?.statuses[0]?.filled) {
            playOrderFilledSound();
            perpsToast.success({
              title: t('page.perps.toast.orderFilled'),
              description: t('page.perps.toast.closeAllPositionsSuccess'),
            });
            return true;
          }
        },
        clearinghouseState,
        'close all positions error'
      );
    }
  );

  const handleUpdateMargin = useMemoizedFn(
    async (coin: string, action: 'add' | 'reduce', margin: number) => {
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const res = await sdk.exchange?.updateIsolatedMargin({
            coin: p.coin,
            value: p.action === 'add' ? p.margin : -p.margin,
          });

          if (res?.status === 'ok') {
            perpsToast.success({
              title: t('page.perps.toast.marginUpdated'),
              description: t(
                p.action === 'add'
                  ? 'page.perpsDetail.PerpsEditMarginPopup.addMarginSuccess'
                  : 'page.perpsDetail.PerpsEditMarginPopup.reduceMarginSuccess'
              ),
            });
            dispatch.perps.fetchClearinghouseState();
          } else {
            const msg = res?.response?.data?.statuses[0];
            throw new Error(msg || 'Update margin failed');
          }
        },
        { coin, action, margin },
        'Update margin failed'
      );
    }
  );

  const handleUpdateMarginModeLeverage = useMemoizedFn(
    async (coin: string, leverage: number, mode: MarginMode) => {
      return withErrorHandler(
        async () => {
          const sdk = getPerpsSDK();
          await sdk.exchange?.updateLeverage({
            coin,
            leverage: leverage,
            isCross: mode === MarginMode.CROSS,
          });
          return true;
        },
        { coin, leverage, mode },
        'update margin mode leverage error'
      );
    }
  );

  const handleSetAutoClose = useMemoizedFn(
    async (params: {
      coin: string;
      tpTriggerPx: string;
      slTriggerPx: string;
      direction: 'Long' | 'Short';
    }) => {
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const { coin, tpTriggerPx, slTriggerPx, direction } = params;
          const formattedTpTriggerPx = formatTriggerPx(tpTriggerPx);
          const formattedSlTriggerPx = formatTriggerPx(slTriggerPx);
          const res = await sdk.exchange?.bindTpslByOrderId({
            coin,
            isBuy: direction === 'Long',
            tpTriggerPx: formattedTpTriggerPx,
            slTriggerPx: formattedSlTriggerPx,
            builder: PERPS_BUILDER_INFO_PRO,
          });
          perpsToast.success({
            title: t('page.perps.toast.success'),
            description: t('page.perps.toast.setAutoCloseSuccess'),
          });
        },
        params,
        'Set auto close failed'
      );
    }
  );

  const handleModifyTpSlOrders = useMemoizedFn(
    async (params: {
      coin: string;
      direction: 'Long' | 'Short';
      tp?: {
        triggerPx: string;
        oid: number;
      };
      sl?: {
        triggerPx: string;
        oid: number;
      };
    }) => {
      return withErrorHandler(
        async (p) => {
          const sdk = getPerpsSDK();
          const { coin, direction, tp, sl } = params;
          const res = await sdk.exchange?.updateTpslByOrderId({
            coin,
            isBuy: direction === 'Long',
            tp,
            sl,
          });
          const resting = res?.response?.data?.statuses[0]?.resting;
          if (resting?.oid) {
            // message.success({
            //   duration: 1.5,
            //   content: t('page.perps.toast.setAutoCloseSuccess'),
            // });
          } else {
            const msg = res?.response?.data?.statuses[0].error;
            throw new Error(msg || 'modify auto close failed');
          }
        },
        params,
        'modify auto close failed'
      );
    }
  );

  const handleCancelOrder = useMemoizedFn(
    async (params: CancelOrderParams[]) => {
      return withErrorHandler(
        async () => {
          const sdk = getPerpsSDK();
          const res = await sdk.exchange?.cancelOrder(params);
          if (
            res?.response.data.statuses.every(
              (item) => ((item as unknown) as string) === 'success'
            )
          ) {
            const num = params.length;
            perpsToast.success({
              title:
                num > 1
                  ? t('page.perps.toast.ordersCancelled')
                  : t('page.perps.toast.orderCancelled'),
              description:
                num > 1
                  ? t('page.perps.toast.cancelAllOrderSuccess', {
                      count: num,
                    })
                  : t('page.perps.toast.cancelOrderSuccess'),
            });
            setTimeout(() => {
              dispatch.perps.fetchPositionOpenOrders();
            }, 100);
          } else {
            perpsToast.error({
              title: t('page.perps.toast.cancelFailed'),
              description: t('page.perps.toast.cancelOrderError'),
            });
          }
        },
        params,
        'cancel error'
      );
    }
  );

  return {
    handleCloseWithMarketOrder,
    handleOpenMarketOrder,
    handleOpenLimitOrder,
    handleOpenTPSlMarketOrder,
    handleOpenTPSlLimitOrder,
    handleOpenTWAPOrder,
    handleCancelTWAPOrder,
    handleOpenScaleOrder,
    calculateScaleOrdersWithSkew,
    handleUpdateMargin,
    handleSetAutoClose,
    handleCloseAllPositions,
    handleModifyTpSlOrders,
    handleUpdateMarginModeLeverage,
    handleCancelOrder,

    needEnableTrading,
    handleActionApproveStatus,
  };
};
