import { sleep, useWallet } from '@/ui/utils';
import { getPerpsSDK } from '../../Perps/sdkManager';
import { PERPS_BUILDER_INFO } from '../../Perps/constants';
import { OrderResponse } from '@rabby-wallet/hyperliquid-sdk';
import { message } from 'antd';
import * as Sentry from '@sentry/browser';
import { useMemoizedFn } from 'ahooks';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useTranslation } from 'react-i18next';

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
        const { coin, isBuy, size, midPx, tpTriggerPx, slTriggerPx } = params;
        const promises = [
          sdk.exchange?.marketOrderOpen({
            coin,
            isBuy,
            size,
            midPx,
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
                builder: PERPS_BUILDER_INFO,
              });
              return result as OrderResponse;
            })()
          );
        }

        const results = await Promise.all(promises);
        const res = results[0];
        const filled = res?.response?.data?.statuses[0]?.filled;
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
            content: msg || 'open position error',
          });
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

  return {
    handleOpenMarketOrder,
  };
};
