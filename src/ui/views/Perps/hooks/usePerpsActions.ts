import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemoizedFn } from 'ahooks';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { capturePerpsError } from '../sentry';
import { UserAbstraction } from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '../sdkManager';
import { formatSpotState } from '../../DesktopPerps/utils';
import { perpsToast } from '../../DesktopPerps/components/PerpsToast';
import { useWallet } from '@/ui/utils';
import type { Account } from '@/background/service/preference';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { typedDataSignatureStore } from '@/ui/component/MiniSignV2';
import { KEYRING_TYPE } from '@/constant';
import { UI_TYPE } from '@/constant/ui';

const ACCOUNT_TYPE_LABEL_KEY: Record<UserAbstraction, string> = {
  [UserAbstraction.UNIFIED_ACCOUNT]:
    'page.perpsPro.settings.accountTypeOption.unifiedAccountShortLabel',
  [UserAbstraction.PORTFOLIO_MARGIN]:
    'page.perpsPro.settings.accountTypeOption.portfolioMarginLabel',
  [UserAbstraction.DISABLED]:
    'page.perpsPro.settings.accountTypeOption.manualLabel',
};

export const usePerpsActions = () => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const currentPerpsAccount = useRabbySelector(
    (s) => s.perps.currentPerpsAccount
  );

  const isDesktop = UI_TYPE.isDesktop;
  const executeSignTypedData = useMemoizedFn(
    async (actions: any[], account: Account) => {
      if (!actions || actions.length === 0) {
        throw new Error('no signature, try later');
      }
      let result: string[] = [];

      const isLocalWallet =
        account.type === KEYRING_TYPE.HdKeyring ||
        account.type === KEYRING_TYPE.SimpleKeyring;
      const useMiniApprove = isDesktop
        ? isLocalWallet
        : supportedDirectSign(account.type);
      if (useMiniApprove) {
        typedDataSignatureStore.close();
        result = await typedDataSignatureStore.start(
          {
            txs: actions.map((item) => {
              return {
                data: item,
                from: account.address,
                version: 'V4',
              };
            }),
            config: {
              account: account,
              mode: isLocalWallet ? undefined : 'UI',
            },
            wallet,
          },
          {}
        );
        typedDataSignatureStore.close();
      } else {
        for (const actionObj of actions) {
          const signature = await wallet.sendRequest<string>(
            {
              method: 'eth_signTypedDataV4',
              params: [account.address, JSON.stringify(actionObj)],
            },
            {
              account,
            }
          );
          result.push(signature);
        }
      }
      return result;
    }
  );

  /**
   * Switches the Hyperliquid account abstraction mode; `DISABLED` is the
   * settings drawer's "Manual" option.
   */
  const handleSetUserAbstraction = useMemoizedFn(
    async (abstraction: UserAbstraction): Promise<boolean> => {
      try {
        const sdk = getPerpsSDK();
        if (!currentPerpsAccount) throw new Error('No currentPerpsAccount');
        if (!sdk.exchange) throw new Error('Hyperliquid no exchange client');

        const action = sdk.exchange.prepareUserSetAbstraction({
          user: currentPerpsAccount.address,
          abstraction,
        });

        const [signature] = await executeSignTypedData(
          [action],
          currentPerpsAccount
        );

        await sdk.exchange.sendUserSetAbstraction({
          action: action.message as any,
          nonce: action.nonce || 0,
          signature: signature as string,
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

        const successText = t(
          'page.perpsPro.settings.accountTypeSwitchSuccess',
          { type: t(ACCOUNT_TYPE_LABEL_KEY[abstraction]) }
        );
        if (isDesktop) {
          perpsToast.success({
            title: t('page.perps.toast.success'),
            description: successText,
          });
        } else {
          message.success({ duration: 1.5, content: successText });
        }
        return true;
      } catch (error: any) {
        console.error('Failed to set user abstraction:', error);
        const failedTitle = t('page.perpsPro.settings.accountTypeSwitchFailed');
        if (isDesktop) {
          perpsToast.error({
            title: failedTitle,
            description: error?.message,
          });
        } else {
          message.error({
            duration: 1.5,
            content: error?.message || failedTitle,
          });
        }
        if (
          !String(error?.message || '')
            .toLowerCase()
            .includes('cancel')
        ) {
          capturePerpsError('setUserAbstraction failed', error, {
            abstraction,
            address: currentPerpsAccount?.address,
            accountType: currentPerpsAccount?.type,
          });
        }
        return false;
      }
    }
  );

  /** Alias for the enable-unified call sites. */
  const handleEnableUnifiedAccount = useMemoizedFn(() =>
    handleSetUserAbstraction(UserAbstraction.UNIFIED_ACCOUNT)
  );

  return {
    handleEnableUnifiedAccount,
    handleSetUserAbstraction,
  };
};
