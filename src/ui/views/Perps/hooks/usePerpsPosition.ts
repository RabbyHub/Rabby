import store, { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemoizedFn } from 'ahooks';
import { message } from 'antd';
import { getPerpsSDK } from '../sdkManager';
import { usePerpsState } from './usePerpsState';
import { capturePerpsError } from '../sentry';
import { sleep, useWallet } from '@/ui/utils';
import {
  PERPS_BUILDER_INFO,
  PERPS_LIMIT_TIF_DEFAULT,
  PerpsOpenOrderType,
} from '../constants';
import {
  OrderResponse,
  ClearinghouseState,
  OpenOrder,
} from '@rabby-wallet/hyperliquid-sdk';
import { useTranslation } from 'react-i18next';
import { isBuilderFeeNotApprovedError } from '../utils';

export const usePerpsPosition = ({
  setCurrentTpOrSl,
}: {
  setCurrentTpOrSl?: (params: { tpPrice?: string; slPrice?: string }) => void;
} = {}) => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const {
    userFills,
    currentPerpsAccount,
    isLogin,
    hasPermission,

    judgeIsUserAgentIsExpired,
    handleActionApproveStatus,
    accountNeedApproveAgent,
    accountNeedApproveBuilderFee,
  } = usePerpsState({});

  const logout = useMemoizedFn((address: string) => {
    dispatch.perps.logout();
    wallet.setPerpsCurrentAccount(null);
    wallet.setSendApproveAfterDeposit(address, []);
  });

  const formatTriggerPx = (px?: string) => {
    // avoid '.15' input error from hy validator
    // '.15' -> '0.15'
    return px ? Number(px).toString() : undefined;
  };

  // builder fee not approved — flag for re-prompt; true means "handled, stop".
  const judgeIsBuilderFeeNeedApprove = useMemoizedFn(
    (errorMessage?: string) => {
      if (!isBuilderFeeNotApprovedError(errorMessage)) {
        return false;
      }
      dispatch.perps.setAccountNeedApproveBuilderFee(true);
      message.error({
        duration: 1.5,
        content: 'Builder fee not approved, please try again',
      });
      return true;
    }
  );

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
        const formattedTpTriggerPx = formatTriggerPx(tpTriggerPx);
        const formattedSlTriggerPx = formatTriggerPx(slTriggerPx);
        const res = await sdk.exchange?.bindTpslByOrderId({
          coin,
          isBuy: direction === 'Long',
          tpTriggerPx: formattedTpTriggerPx,
          slTriggerPx: formattedSlTriggerPx,
          builder: PERPS_BUILDER_INFO,
        });

        const nextCurrentTpOrSl = {} as { tpPrice?: string; slPrice?: string };
        formattedTpTriggerPx &&
          (nextCurrentTpOrSl.tpPrice = formattedTpTriggerPx);
        formattedSlTriggerPx &&
          (nextCurrentTpOrSl.slPrice = formattedSlTriggerPx);
        setCurrentTpOrSl?.(nextCurrentTpOrSl);
        setTimeout(() => {
          dispatch.perps.fetchPositionOpenOrders();
        }, 1000);
        message.success({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: tpTriggerPx
            ? t('page.perps.toast.takeProfitSuccess')
            : t('page.perps.toast.stopLossSuccess'),
        });
      } catch (error) {
        const isExpired = await judgeIsUserAgentIsExpired(error?.message || '');
        if (isExpired) {
          return;
        }
        if (judgeIsBuilderFeeNeedApprove(error?.message)) {
          return;
        }
        const errorText = params.tpTriggerPx
          ? 'Take profit set error'
          : 'Stop loss set error';
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: error?.message || errorText,
        });
        capturePerpsError(errorText, error, { params });
      }
    }
  );

  const handleCancelOrder = useMemoizedFn(
    async (oid: number, coin: string, actionType: 'tp' | 'sl') => {
      const actionText = actionType === 'tp' ? 'Take profit' : 'Stop loss';
      try {
        const sdk = getPerpsSDK();
        const res = await sdk.exchange?.cancelOrder([
          {
            oid,
            coin,
          },
        ]);
        if (
          res?.response.data.statuses.every(
            (item) => ((item as unknown) as string) === 'success'
          )
        ) {
          message.success({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: actionText + ' canceled successfully',
          });
          setTimeout(() => {
            dispatch.perps.fetchPositionOpenOrders();
          }, 1000);
        } else {
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: actionText + ' cancel error',
          });
          capturePerpsError(`${actionText} cancel error`, null, {
            oid,
            coin,
            res,
          });
        }
      } catch (error) {
        message.error({
          className: 'toast-message-2025',
          content: actionText + ' cancel error',
        });
        capturePerpsError(`${actionText} cancel error`, error, { oid, coin });
      }
    }
  );

  const handleUpdateMargin = useMemoizedFn(
    async (
      coin: string,
      dex: string,
      action: 'add' | 'reduce',
      margin: number
    ) => {
      try {
        const sdk = getPerpsSDK();
        const res = await sdk.exchange?.updateIsolatedMargin({
          coin,
          value: action === 'add' ? margin : -margin,
        });

        if (res?.status === 'ok') {
          message.success({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: t(
              action === 'add'
                ? 'page.perpsDetail.PerpsEditMarginPopup.addMarginSuccess'
                : 'page.perpsDetail.PerpsEditMarginPopup.reduceMarginSuccess'
            ),
          });
          dispatch.perps.fetchClearinghouseState({ dex });
        } else {
          const msg = res?.response?.data?.statuses[0];
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: msg || 'Update margin failed',
          });
          capturePerpsError('update margin failed', null, {
            coin,
            dex,
            action,
            margin,
            res,
          });
        }
      } catch (error) {
        console.error('Update margin error:', error);
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: error?.message || 'Update margin failed',
        });
        capturePerpsError('update margin error', error, {
          coin,
          dex,
          action,
          margin,
        });
        throw error;
      }
    }
  );

  /**
   * Applies the margin mode on click instead of waiting for the order. HL sets
   * mode and leverage in one action, so pass the account's current leverage —
   * a stale value would silently move the liquidation price. Returns false when
   * the call failed; the error is already surfaced.
   */
  const handleUpdateMarginMode = useMemoizedFn(
    async (params: {
      coin: string;
      leverage: number;
      marginMode: 'cross' | 'isolated';
    }) => {
      const { coin, leverage, marginMode } = params;
      try {
        const sdk = getPerpsSDK();
        await sdk.exchange?.updateLeverage({
          coin,
          leverage,
          isCross: marginMode === 'cross',
        });
        return true;
      } catch (error) {
        if (await judgeIsUserAgentIsExpired(error?.message || '')) {
          return false;
        }
        if (judgeIsBuilderFeeNeedApprove(error?.message)) {
          return false;
        }
        console.error('Update margin mode error:', error);
        message.error({
          duration: 1.5,
          content: error?.message || 'Update margin mode failed',
        });
        capturePerpsError('update margin mode error', error, { params });
        return false;
      }
    }
  );

  const handleClosePosition = useMemoizedFn(
    async (params: {
      coin: string;
      dex: string;
      size: string;
      price: string;
      direction: 'Long' | 'Short';
    }) => {
      try {
        const sdk = getPerpsSDK();
        const { coin, dex, direction, price, size } = params;
        const res = await sdk.exchange?.marketOrderClose({
          coin,
          isBuy: direction === 'Short',
          size,
          midPx: price,
          builder: PERPS_BUILDER_INFO,
        });

        const filled = res?.response?.data?.statuses[0]?.filled;
        if (filled) {
          dispatch.perps.fetchClearinghouseState({ dex });
          dispatch.perps.fetchUserHistoricalOrders();
          const { totalSz, avgPx } = filled;
          message.success({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: t('page.perps.toast.closePositionSuccess', {
              direction,
              coin,
              size: totalSz,
              price: avgPx,
            }),
          });
          setCurrentTpOrSl?.({
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
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: msg || 'close position error',
          });
          capturePerpsError('close position noFills', null, { params, res });
          return null;
        }
      } catch (e) {
        const isExpired = await judgeIsUserAgentIsExpired(e?.message || '');
        if (isExpired) {
          return null;
        }
        if (judgeIsBuilderFeeNeedApprove(e?.message)) {
          return null;
        }
        console.error('close position error', e);
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: e?.message || 'close position error',
        });
        capturePerpsError('close position error', e, { params });
        return null;
      }
    }
  );

  const handleOpenPosition = useMemoizedFn(
    async (params: {
      coin: string;
      dex: string;
      size: string;
      leverage: number;
      direction: 'Long' | 'Short';
      midPx: string;
      tpTriggerPx?: string;
      slTriggerPx?: string;
      marginMode?: 'cross' | 'isolated';
      isAddPosition?: boolean;
      orderType?: PerpsOpenOrderType;
      limitPx?: string;
    }) => {
      try {
        const sdk = getPerpsSDK();
        const {
          coin,
          dex,
          leverage,
          direction,
          size,
          midPx,
          tpTriggerPx,
          slTriggerPx,
          marginMode = 'isolated',
          orderType,
          limitPx,
        } = params;
        if (!params.isAddPosition) {
          await sdk.exchange?.updateLeverage({
            coin,
            leverage,
            isCross: marginMode === 'cross',
          });
        }

        const isLimit = orderType === 'limit' && !!limitPx;
        const promises = [
          isLimit
            ? sdk.exchange?.limitOrderOpen({
                coin,
                isBuy: direction === 'Long',
                size,
                limitPx: limitPx as string,
                tif: PERPS_LIMIT_TIF_DEFAULT,
                builder: PERPS_BUILDER_INFO,
              })
            : sdk.exchange?.marketOrderOpen({
                coin,
                isBuy: direction === 'Long',
                size,
                midPx,
                builder: PERPS_BUILDER_INFO,
              }),
        ];

        const formattedTpTriggerPx = formatTriggerPx(tpTriggerPx);
        const formattedSlTriggerPx = formatTriggerPx(slTriggerPx);

        // Limit mode hides TP/SL — guard against stale market-mode triggers leaking in.
        if (!isLimit && (tpTriggerPx || slTriggerPx)) {
          promises.push(
            (async () => {
              await sleep(10); // little delay to ensure nonce is correct

              const result = await sdk.exchange?.bindTpslByOrderId({
                coin,
                isBuy: direction === 'Long',
                tpTriggerPx: formattedTpTriggerPx,
                slTriggerPx: formattedSlTriggerPx,
                builder: PERPS_BUILDER_INFO,
              });
              return result as OrderResponse;
            })()
          );
        }

        const results = await Promise.all(promises);
        const res = results[0];
        const filled = res?.response?.data?.statuses[0]?.filled;
        const resting = res?.response?.data?.statuses[0]?.resting;
        if (filled) {
          dispatch.perps.fetchClearinghouseState({ dex });
          if (resting || tpTriggerPx || slTriggerPx) {
            dispatch.perps.fetchPositionOpenOrdersHttp({ dex });
          }

          const { totalSz, avgPx } = filled;
          message.success({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: t('page.perps.toast.openPositionSuccess', {
              direction,
              coin,
              size: totalSz,
              price: avgPx,
            }),
          });
          setCurrentTpOrSl?.({
            tpPrice: formattedTpTriggerPx,
            slPrice: formattedSlTriggerPx,
          });
          return res?.response?.data?.statuses[0]?.filled as {
            totalSz: string;
            avgPx: string;
            oid: number;
          };
        } else if (isLimit && resting) {
          // Resting (not filled) — treat as success and refresh open-orders list.
          dispatch.perps.fetchPositionOpenOrdersHttp({ dex });
          message.success({
            duration: 1.5,
            content: t('page.perps.toast.limitOrderPlaced', {
              direction,
              coin,
              size,
              price: limitPx,
            }),
          });
          return {
            totalSz: size,
            avgPx: limitPx || '0',
            oid: resting.oid,
          };
        } else {
          const msg = res?.response?.data?.statuses[0]?.error;
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: msg || 'open position error',
          });
          capturePerpsError('open position noFills', null, { params, res });
        }
      } catch (error) {
        const isExpired = await judgeIsUserAgentIsExpired(error?.message || '');
        if (isExpired) {
          return;
        }
        if (judgeIsBuilderFeeNeedApprove(error?.message)) {
          return;
        }
        console.error(error);
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: error?.message || 'open position error',
        });
        capturePerpsError('open position error', error, { params });
      }
    }
  );

  const handleStableCoinOrder = useMemoizedFn(
    async (params: {
      coin: 'USDT' | 'USDH' | 'USDE';
      isBuy: boolean;
      size: string;
      limitPx: string;
    }): Promise<boolean> => {
      try {
        const sdk = getPerpsSDK();
        if (!sdk.exchange) throw new Error('Hyperliquid no exchange client');
        await sdk.exchange.stableCoinOrder(params);
        // Spot balance refresh comes from the existing subscribeToSpotState WS push.
        return true;
      } catch (error: any) {
        const isExpired = await judgeIsUserAgentIsExpired(error?.message || '');
        if (isExpired) {
          return false;
        }
        if (judgeIsBuilderFeeNeedApprove(error?.message)) {
          return false;
        }
        console.error('PERPS stableCoinOrder error', error);
        message.error({
          duration: 1.5,
          content: error?.message || t('page.perps.PerpsSpotSwap.swapFailed'),
        });
        capturePerpsError('stableCoinOrder error', error, { params });
        return false;
      }
    }
  );

  const handleCloseAllPositions = useMemoizedFn(
    async (clearinghouseState: ClearinghouseState) => {
      try {
        const sdk = getPerpsSDK();
        const res = await sdk.exchange?.closeAllPositions(
          clearinghouseState,
          0.08,
          PERPS_BUILDER_INFO
        );
        if (res?.response?.data?.statuses[0]?.filled) {
          message.success({
            duration: 1.5,
            content: t('page.perps.toast.closeAllPositionsSuccess'),
          });
          dispatch.perps.fetchClearinghouseState();
          return true;
        }
      } catch (error: any) {
        const isExpired = await judgeIsUserAgentIsExpired(error?.message || '');
        if (isExpired) {
          return false;
        }
        if (judgeIsBuilderFeeNeedApprove(error?.message)) {
          return false;
        }
        console.error('PERPS closeAllPositions error', error);
        message.error({
          duration: 1.5,
          content: error?.message || 'Close all positions error',
        });
        capturePerpsError('closeAllPositions error', error);
        return false;
      }
    }
  );

  const handleCancelLimitOrders = useMemoizedFn(
    async (orders: OpenOrder[]): Promise<boolean> => {
      if (!orders.length) return false;
      try {
        const sdk = getPerpsSDK();
        const res = await sdk.exchange?.cancelOrder(
          orders.map((o) => ({ oid: o.oid, coin: o.coin }))
        );
        const statuses = res?.response.data.statuses ?? [];
        const okCount = statuses.filter(
          (item) => typeof item === 'string' && item === 'success'
        ).length;
        const failCount = statuses.length - okCount;

        if (okCount > 0) {
          message.success({
            duration: 1.5,
            content:
              orders.length > 1
                ? t('page.perps.toast.cancelLimitOrdersSuccess', {
                    count: okCount,
                  })
                : t('page.perps.toast.cancelLimitOrderSuccess'),
          });
          if (failCount > 0) {
            capturePerpsError('cancel limit orders partial fail', null, {
              failCount,
              okCount,
              res,
            });
          }
          const marketDataMap = store.getState().perps.marketDataMap;
          dispatch.perps.fetchPositionOpenOrdersHttpForDexes({
            dexes: orders.map((o) => marketDataMap[o.coin]?.dexId ?? ''),
          });
          return true;
        }

        message.error({
          duration: 1.5,
          content: t('page.perps.toast.cancelLimitOrderError'),
        });
        capturePerpsError('cancel limit orders failed', null, { res });
        return false;
      } catch (error: any) {
        const isExpired = await judgeIsUserAgentIsExpired(error?.message || '');
        if (isExpired) return false;
        if (judgeIsBuilderFeeNeedApprove(error?.message)) return false;
        message.error({
          duration: 1.5,
          content:
            error?.message || t('page.perps.toast.cancelLimitOrderError'),
        });
        capturePerpsError('cancel limit orders error', error);
        return false;
      }
    }
  );

  return {
    handleCloseAllPositions,
    handleOpenPosition,
    handleClosePosition,
    handleSetAutoClose,
    handleCancelOrder,
    handleCancelLimitOrders,
    handleUpdateMargin,
    handleUpdateMarginMode,
    handleStableCoinOrder,
    userFills,
    isLogin,
    currentPerpsAccount,
    hasPermission,
    handleActionApproveStatus,
    accountNeedApproveAgent,
    accountNeedApproveBuilderFee,
  };
};
