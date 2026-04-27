import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemoizedFn } from 'ahooks';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/browser';
import { UserAbstraction } from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '../sdkManager';
import { formatSpotState } from '../../DesktopPerps/utils';
import { useWallet } from '@/ui/utils';

/**
 * Lightweight hook for stablecoin swap & Unified Account enable actions.
 * Decoupled from usePerpsInitial's initialization side-effects so modals can use it safely.
 */
export const usePerpsActions = () => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const currentPerpsAccount = useRabbySelector(
    (s) => s.perps.currentPerpsAccount
  );

  const handleEnableUnifiedAccount = useMemoizedFn(
    async (): Promise<boolean> => {
      try {
        const sdk = getPerpsSDK();
        if (!currentPerpsAccount) throw new Error('No currentPerpsAccount');
        if (!sdk.exchange) throw new Error('Hyperliquid no exchange client');

        const prepared = sdk.exchange.prepareUserSetAbstraction({
          user: currentPerpsAccount.address,
          abstraction: UserAbstraction.UNIFIED_ACCOUNT,
        });

        const actionObj = {
          domain: prepared.domain,
          types: prepared.types,
          primaryType: prepared.primaryType,
          message: prepared.message,
        };
        const signature = await wallet.sendRequest<string>(
          {
            method: 'eth_signTypedDataV4',
            params: [currentPerpsAccount.address, JSON.stringify(actionObj)],
          },
          { account: currentPerpsAccount }
        );

        await sdk.exchange.sendUserSetAbstraction({
          action: prepared.message as any,
          nonce: prepared.nonce || 0,
          signature,
        });

        const [userAbsRes, spotRes] = await Promise.allSettled([
          sdk.info.getUserAbstraction(currentPerpsAccount.address),
          sdk.info.getSpotClearingHouseState(currentPerpsAccount.address),
        ]);
        if (userAbsRes.status === 'fulfilled') {
          dispatch.perps.patchState({ userAbstraction: userAbsRes.value });
        } else {
          console.error(
            'fetch userAbstraction after enable failed',
            userAbsRes.reason
          );
        }
        if (spotRes.status === 'fulfilled') {
          dispatch.perps.patchState({
            spotState: formatSpotState(spotRes.value),
          });
        } else {
          console.error('fetch spotState after enable failed', spotRes.reason);
        }

        message.success({
          duration: 1.5,
          content: t('page.perps.PerpsSpotSwap.enabledSuccess'),
        });
        return true;
      } catch (error: any) {
        console.error('Failed to enable unified account:', error);
        message.error({
          duration: 1.5,
          content: error?.message || t('page.perps.PerpsSpotSwap.enableFailed'),
        });
        if (
          !String(error?.message || '')
            .toLowerCase()
            .includes('cancel')
        ) {
          Sentry.captureException(
            new Error(
              'PERPS enableUnifiedAccount failed account: ' +
                JSON.stringify(currentPerpsAccount) +
                ' error: ' +
                JSON.stringify({ error })
            )
          );
        }
        return false;
      }
    }
  );

  return {
    handleEnableUnifiedAccount,
  };
};
