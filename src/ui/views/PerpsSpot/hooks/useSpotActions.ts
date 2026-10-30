import { useMemoizedFn } from 'ahooks';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { usePerpsStore } from '@/ui/state/perps';
import { useRabbyDispatch } from '@/ui/store';
import { isSameAddress } from '@/ui/utils';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { usePerpsState } from '@/ui/views/Perps/hooks/usePerpsState';
import { capturePerpsError } from '@/ui/views/Perps/sentry';
import { isBuilderFeeNotApprovedError } from '@/ui/views/Perps/utils';
import { normalizeSpotCancelIntents } from '../utils/spotMarkets';
import type {
  SpotCancelIntent,
  SpotOrderSide,
  SpotOrderType,
} from '../utils/spotMarkets';

export type PerpsSpotOrderParams = {
  pairIndex: number;
  side: SpotOrderSide;
  type: SpotOrderType;
  /** Already rounded to the base token szDecimals. */
  size: string;
  /** Already rounded to spot price rules. */
  limitPx: string;
};

export type PerpsSpotOrderResult =
  | { status: 'filled'; totalSz: string; avgPx: string; oid: number }
  | { status: 'resting'; oid: number };

// The approve step has already shown its own toast; don't report it twice.
class ApproveAbortedError extends Error {}

const isCancelStatusOk = (status: unknown) =>
  status === 'success' ||
  (!!status &&
    typeof status === 'object' &&
    !!(status as { success?: boolean }).success);

const getCancelStatusError = (status: unknown) =>
  status && typeof status === 'object'
    ? (status as { error?: string }).error
    : undefined;

const getExchange = () => {
  const exchange = getPerpsSDK().exchange;
  if (!exchange) {
    throw new Error('Hyperliquid exchange client unavailable');
  }
  return exchange;
};

export const useSpotActions = () => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const {
    judgeIsUserAgentIsExpired,
    handleActionApproveStatus,
  } = usePerpsState({});

  // Same backend region gate as perps trading; checked before and after the
  // approval step, which can await the user.
  const assertPermission = () => {
    if (!usePerpsStore.getState().hasPermission) {
      throw new Error(t('page.perps.permissionTips'));
    }
  };

  const assertActionAccount = async () => {
    const account = usePerpsStore.getState().currentPerpsAccount;
    if (!account) {
      throw new Error('No current Perps account');
    }
    assertPermission();
    try {
      await handleActionApproveStatus();
    } catch (error) {
      throw new ApproveAbortedError(String(error));
    }
    const latest = usePerpsStore.getState().currentPerpsAccount;
    if (
      !latest ||
      latest.type !== account.type ||
      !isSameAddress(latest.address, account.address)
    ) {
      throw new Error('Perps account changed');
    }
    assertPermission();
  };

  const runAction = async <T>(
    label: string,
    fallback: T,
    context: Record<string, unknown>,
    fn: () => Promise<T>
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error: any) {
      if (error instanceof ApproveAbortedError) {
        return fallback;
      }
      const errorMessage: string = error?.message || '';
      if (await judgeIsUserAgentIsExpired(errorMessage)) {
        return fallback;
      }
      if (isBuilderFeeNotApprovedError(errorMessage)) {
        dispatch.perps.setAccountNeedApproveBuilderFee(true);
        return fallback;
      }
      console.error(`PERPS ${label} error`, error);
      message.error({
        duration: 1.5,
        content: errorMessage || `${label} error`,
      });
      capturePerpsError(`${label} error`, error, context);
      return fallback;
    }
  };

  /**
   * Place a spot order. `buildParams` runs after the agent approval (which can
   * take a while) so the price, size and balance checks reflect the latest
   * market; returning null aborts without signing.
   */
  const executeSpotOrder = useMemoizedFn(
    (pairIndex: number, buildParams: () => PerpsSpotOrderParams | null) =>
      runAction<PerpsSpotOrderResult | null>(
        'spot trade',
        null,
        { pairIndex },
        async () => {
          await assertActionAccount();
          const params = buildParams();
          if (!params) {
            throw new Error(t('page.perpsSpot.error.contextChanged'));
          }
          const response = await getExchange().spotOrder({
            pairIndex: params.pairIndex,
            isBuy: params.side === 'buy',
            size: params.size,
            limitPx: params.limitPx,
            // Market orders must not rest on the book when they don't fill.
            tif: params.type === 'market' ? 'Ioc' : 'Gtc',
          });
          const status = response?.response?.data?.statuses?.[0];
          if (status?.filled) {
            message.success({
              duration: 1.5,
              content: t('page.perpsSpot.toast.orderFilled'),
            });
            return { status: 'filled', ...status.filled };
          }
          if (status?.resting) {
            message.success({
              duration: 1.5,
              content: t('page.perpsSpot.toast.orderPlaced'),
            });
            return { status: 'resting', oid: status.resting.oid };
          }
          throw new Error(
            status?.error || t('page.perpsSpot.toast.orderFailed')
          );
        }
      )
  );

  const cancelSpotOrder = useMemoizedFn((intent: SpotCancelIntent) =>
    runAction<boolean>('spot cancel', false, { ...intent }, async () => {
      const params = normalizeSpotCancelIntents([intent]);
      await assertActionAccount();
      const response = await getExchange().cancelSpotOrders(params);
      // The API answers "success" as a bare string; the SDK types it as an
      // object, so accept both shapes.
      const status: unknown = response?.response?.data?.statuses?.[0];
      if (isCancelStatusOk(status)) {
        message.success({
          duration: 1.5,
          content: t('page.perpsSpot.toast.orderCancelled'),
        });
        return true;
      }
      throw new Error(
        getCancelStatusError(status) || t('page.perpsSpot.toast.cancelFailed')
      );
    })
  );

  /** Cancel several spot orders in one signed action; true when all succeed. */
  const cancelAllSpotOrders = useMemoizedFn((intents: SpotCancelIntent[]) =>
    runAction<boolean>(
      'spot cancel all',
      false,
      { count: intents.length },
      async () => {
        if (!intents.length) {
          return true;
        }
        const params = normalizeSpotCancelIntents(intents);
        await assertActionAccount();
        const response = await getExchange().cancelSpotOrders(params);
        const statuses: unknown[] = response?.response?.data?.statuses ?? [];
        const failed = statuses.find((status) => !isCancelStatusOk(status));
        if (statuses.length === params.length && !failed) {
          message.success({
            duration: 1.5,
            content: t('page.perpsSpot.toast.ordersCancelled'),
          });
          return true;
        }
        throw new Error(
          getCancelStatusError(failed) || t('page.perpsSpot.toast.cancelFailed')
        );
      }
    )
  );

  return { executeSpotOrder, cancelSpotOrder, cancelAllSpotOrders };
};
