import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Account } from '@/background/service/preference';
import { useCallback, useEffect } from 'react';
import { useWallet } from '@/ui/utils';
import { getPerpsSDK, initPerpsSDK } from './sdkManager';
import { PERPS_AGENT_NAME } from './constants';
import { isSameAddress } from '@/ui/utils';
import { findAccountByPriority } from '@/utils/account';
import { KEYRING_CLASS } from '@/constant';
import { useMemoizedFn } from 'ahooks';

export const usePerpsState = () => {
  const dispatch = useRabbyDispatch();
  const perpsState = useRabbySelector((state) => state.perps);
  const { isInitialized } = perpsState;
  const { accountsList } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
  }));

  const wallet = useWallet();

  const checkIsExtraAgentIsExpired = useMemoizedFn(
    async (masterAddress: string, agentAddress: string) => {
      const sdk = getPerpsSDK();
      const extraAgents = await sdk.info.extraAgents(masterAddress);
      const expiredAt = extraAgents.find((agent) =>
        isSameAddress(agent.address, agentAddress)
      )?.validUntil;
      const oneDayAfter = Date.now() + 24 * 60 * 60 * 1000;
      const isExpired = expiredAt ? expiredAt < oneDayAfter : true;
      return isExpired;
    }
  );

  const checkIsNeedAutoLoginOut = useMemoizedFn(
    async (masterAddress: string, agentAddress: string) => {
      const isExpired = await checkIsExtraAgentIsExpired(
        masterAddress,
        agentAddress
      );
      if (isExpired) {
        console.warn('masterAddress isExpired, auto logout', masterAddress);
        logout();
      }
    }
  );

  useEffect(() => {
    if (isInitialized) return;

    const init = async () => {
      try {
        const currentAddress = await wallet.getPerpsCurrentAddress();
        if (!currentAddress) {
          return;
        }

        const list = accountsList.filter(
          (acc: any) =>
            acc.type !== KEYRING_CLASS.WATCH &&
            acc.type !== KEYRING_CLASS.GNOSIS
        );

        const targetTypeAccount = findAccountByPriority(
          list.filter((acc: any) => isSameAddress(acc.address, currentAddress))
        );

        if (!targetTypeAccount) return;

        const res = await wallet.getPerpsAgentWallet(targetTypeAccount.address);
        if (!res) return;

        initPerpsSDK({
          masterAddress: currentAddress,
          agentPrivateKey: res.vault,
          agentPublicKey: res.preference.agentAddress || '',
          agentName: PERPS_AGENT_NAME,
        });

        dispatch.perps.setCurrentPerpsAccount(targetTypeAccount);

        await dispatch.perps.refreshData();

        await checkIsNeedAutoLoginOut(
          currentAddress,
          res.preference.agentAddress
        );

        dispatch.perps.fetchMarketData();

        dispatch.perps.fetchPerpFee();

        dispatch.perps.setInitialized(true);
      } catch (error) {
        console.error('Failed to init Perps state:', error);
      }
    };

    init();
  }, [wallet, dispatch, isInitialized]);

  const loginPerpsAccount = useCallback(
    async (account: Account) => {
      try {
        dispatch.perps.setLoading(true);
        dispatch.perps.setError(null);

        let privateKey = '';
        let publicKey = '';
        const res = await wallet.getPerpsAgentWallet(account.address);
        if (res) {
          privateKey = res.vault;
          publicKey = res.preference.agentAddress;
        } else {
          const { agentAddress, vault } = await wallet.createPerpsAgentWallet(
            account.address
          );
          privateKey = vault;
          publicKey = agentAddress;
        }

        const sdk = initPerpsSDK({
          masterAddress: account.address,
          agentPrivateKey: privateKey,
          agentPublicKey: publicKey,
          agentName: PERPS_AGENT_NAME,
        });

        const action = sdk.exchange?.prepareApproveAgent();

        console.log('action', action);
        let signature = '';
        if (
          account.type === KEYRING_CLASS.PRIVATE_KEY ||
          account.type === KEYRING_CLASS.MNEMONIC
        ) {
          signature = await wallet.signTypedData(
            account.type,
            account.address,
            action as any,
            { version: 'V4' }
          );
        } else {
          signature = await wallet.sendRequest({
            method: 'eth_signTypedDataV4',
            params: [account.address, action],
          });
        }

        const { role } = await sdk.info.getUserRole();
        const isNeedDepositBeforeApprove = role === 'missing';

        if (isNeedDepositBeforeApprove) {
          await wallet.saveApproveAgentAfterDeposit(
            account.address,
            action,
            action?.nonce || 0,
            signature
          );
        } else {
          await sdk.exchange?.sendApproveAgent({
            action: action?.message as any,
            nonce: action?.nonce || 0,
            signature: signature as string,
          });
        }

        dispatch.perps.setCurrentPerpsAccount(account);
        await wallet.setPerpsCurrentAddress(account.address);

        await dispatch.perps.refreshData();
      } catch (error: any) {
        console.error('Failed to login Perps account:', error);
        dispatch.perps.setError(error.message || 'Login failed');
      } finally {
        dispatch.perps.setLoading(false);
      }
    },
    [dispatch, wallet]
  );

  const logout = useCallback(() => {
    dispatch.perps.logout();
    wallet.setPerpsCurrentAddress('');
  }, [dispatch, wallet]);

  const setCurrentPerpsAccount = useCallback(
    (account: Account | null) => {
      dispatch.perps.setCurrentPerpsAccount(account);
    },
    [dispatch]
  );

  return {
    // State
    marketData: perpsState.marketData,
    marketDataMap: perpsState.marketDataMap,
    positionAndOpenOrders: perpsState.positionAndOpenOrders,
    accountSummary: perpsState.accountSummary,
    currentPerpsAccount: perpsState.currentPerpsAccount,
    isLogin: perpsState.isLogin,
    loading: perpsState.loading,
    error: perpsState.error,
    isInitialized: perpsState.isInitialized,

    // Actions
    loginPerpsAccount,
    logout,
    setCurrentPerpsAccount,
  };
};

export default usePerpsState;
