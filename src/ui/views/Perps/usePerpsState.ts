import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Account } from '@/background/service/preference';
import { useCallback, useEffect } from 'react';
import { useWallet } from '@/ui/utils';
import { getPerpsSDK, initPerpsSDK } from './sdkManager';
import { PERPS_AGENT_NAME, PERPS_BUILD_FEE_RECEIVE_ADDRESS } from './constants';
import { isSameAddress } from '@/ui/utils';
import { findAccountByPriority } from '@/utils/account';
import { KEYRING_CLASS } from '@/constant';
import { useInterval, useMemoizedFn } from 'ahooks';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { message } from 'antd';
type SignActionType = 'approveAgent' | 'approveBuilderFee';

interface SignAction {
  action: any;
  type: SignActionType;
  signature: string;
}

interface ApproveData {
  action: any;
  nonce: number;
  signature: string;
}

interface AgentWallet {
  privateKey: string;
  publicKey: string;
}

export const usePerpsState = () => {
  const dispatch = useRabbyDispatch();
  const perpsState = useRabbySelector((state) => state.perps);
  const { isInitialized, currentPerpsAccount, isLogin } = perpsState;
  const currentAccount = useCurrentAccount();
  const { accountsList } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
  }));

  const wallet = useWallet();

  const checkIsExtraAgentIsExpired = useMemoizedFn(
    async (masterAddress: string, agentAddress: string) => {
      const sdk = getPerpsSDK();
      const extraAgents = await sdk.info.extraAgents(masterAddress);
      const item = extraAgents.find((agent) =>
        isSameAddress(agent.address, agentAddress)
      );
      if (!item) {
        return true;
      }
      const expiredAt = item?.validUntil;
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
        console.warn('masterAddress isExpired, update agent, next auto login');
        // need to update agent for send new approve agent api avoid error
        wallet.createPerpsAgentWallet(masterAddress);
      }
    }
  );

  useInterval(() => {
    if (isInitialized && isLogin) {
      dispatch.perps.fetchClearinghouseState(undefined);
    } else {
      // need to check if send approve data
      if (perpsState.approveData.length > 0) {
        dispatch.perps.fetchClearinghouseState(undefined);
      }
    }
  }, 5000);

  useEffect(() => {
    if (isInitialized && isLogin) {
      dispatch.perps.fetchClearinghouseState(undefined);
      return;
    }

    const init = async () => {
      try {
        const currentAddress = await wallet.getPerpsCurrentAddress();
        if (!currentAddress) {
          dispatch.perps.fetchMarketData(true);
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

        checkIsNeedAutoLoginOut(currentAddress, res.preference.agentAddress);

        await dispatch.perps.fetchMarketData(true);

        setTimeout(() => {
          // is not very matter, just wait for the other query api
          dispatch.perps.fetchPerpFee();
        }, 2000);

        dispatch.perps.setInitialized(true);
      } catch (error) {
        console.error('Failed to init Perps state:', error);
      }
    };

    init();
  }, [wallet, dispatch, isInitialized]);

  const getOrCreateAgentWallet = useMemoizedFn(
    async (account: Account): Promise<AgentWallet> => {
      const res = await wallet.getPerpsAgentWallet(account.address);
      if (res) {
        return {
          privateKey: res.vault,
          publicKey: res.preference.agentAddress,
        };
      }

      const { agentAddress, vault } = await wallet.createPerpsAgentWallet(
        account.address
      );
      return {
        privateKey: vault,
        publicKey: agentAddress,
      };
    }
  );

  const prepareSignActions = useMemoizedFn(
    async (): Promise<SignAction[]> => {
      const sdk = getPerpsSDK();

      const signActions: SignAction[] = [
        {
          action: sdk.exchange?.prepareApproveAgent(),
          type: 'approveAgent',
          signature: '',
        },
      ];

      const maxFee = await sdk.info.getMaxBuilderFee(
        PERPS_BUILD_FEE_RECEIVE_ADDRESS
      );
      if (!maxFee) {
        const buildAction = sdk.exchange?.prepareApproveBuilderFee({
          builder: PERPS_BUILD_FEE_RECEIVE_ADDRESS,
        });
        signActions.push({
          action: buildAction,
          type: 'approveBuilderFee',
          signature: '',
        });
      }

      return signActions;
    }
  );

  const executeSignatures = useMemoizedFn(
    async (signActions: SignAction[], account: Account): Promise<void> => {
      const isLocalWallet =
        account.type === KEYRING_CLASS.PRIVATE_KEY ||
        account.type === KEYRING_CLASS.MNEMONIC;

      for (const actionObj of signActions) {
        const signature = isLocalWallet
          ? await wallet.signTypedData(
              account.type,
              account.address,
              actionObj.action,
              { version: 'V4' }
            )
          : await wallet.sendRequest({
              method: 'eth_signTypedDataV4',
              params: [account.address, actionObj.action],
            });

        actionObj.signature = signature as string;
      }
    }
  );

  const createApproveData = (actionObj: SignAction): ApproveData | null => {
    if (!actionObj.action?.signature) return null;

    return {
      action: actionObj.action,
      nonce: actionObj.action?.nonce || 0,
      signature: actionObj.signature,
    };
  };

  useEffect(() => {
    if (
      perpsState.accountSummary?.withdrawable &&
      Number(perpsState.accountSummary.withdrawable) > 0 &&
      currentPerpsAccount?.address &&
      perpsState.approveData.length > 0
    ) {
      const init = async () => {
        const data = perpsState.approveData;
        dispatch.perps.setApproveData([]);
        await handleDirectApprove(data);
      };
      init();
    }
  }, [perpsState.accountSummary]);

  const handleDirectApprove = useCallback(
    async (signActions: SignAction[]): Promise<void> => {
      const sdk = getPerpsSDK();

      console.log('handleDirectApprove', sdk.exchange);

      const results = await Promise.all(
        signActions.map(async (actionObj) => {
          const { action, type, signature } = actionObj;

          if (type === 'approveAgent') {
            return sdk.exchange?.sendApproveAgent({
              action: action?.message,
              nonce: action?.nonce || 0,
              signature,
            });
          } else if (type === 'approveBuilderFee') {
            // return sdk.exchange?.sendApproveBuilderFee({
            //   action: action?.message,
            //   nonce: action?.nonce || 0,
            //   signature,
            // });
            return Promise.resolve(true);
          }
        })
      );

      const [approveAgentRes, approveBuilderFeeRes] = results;
      console.log('sendApproveAgentRes', approveAgentRes);
      console.log('sendApproveBuilderFeeRes', approveBuilderFeeRes);
    },
    []
  );

  const loginPerpsAccount = useMemoizedFn(async (account: Account) => {
    try {
      dispatch.perps.setLoading(true);
      dispatch.perps.setError(null);

      const { privateKey, publicKey } = await getOrCreateAgentWallet(account);

      const sdk = initPerpsSDK({
        masterAddress: account.address,
        agentPrivateKey: privateKey,
        agentPublicKey: publicKey,
        agentName: PERPS_AGENT_NAME,
      });
      console.log('loginPerpsAccount sdk', sdk);

      const isExpired = await checkIsExtraAgentIsExpired(
        account.address,
        publicKey
      );
      if (!isExpired) {
        dispatch.perps.setCurrentPerpsAccount(account);
        await wallet.setPerpsCurrentAddress(account.address);
        await dispatch.perps.refreshData();
        return true;
      } else {
        const { agentAddress, vault } = await wallet.createPerpsAgentWallet(
          account.address
        );
        const sdk = initPerpsSDK({
          masterAddress: account.address,
          agentPrivateKey: vault,
          agentPublicKey: agentAddress,
          agentName: PERPS_AGENT_NAME,
        });
        const signActions = await prepareSignActions();

        await executeSignatures(signActions, account);

        const { role } = await sdk.info.getUserRole();
        const isNeedDepositBeforeApprove = role === 'missing';

        if (isNeedDepositBeforeApprove) {
          const approveData = signActions.map((action) => {
            return {
              action: action.action,
              nonce: action.action?.nonce || 0,
              signature: action.signature,
              type: action.type,
            };
          });
          dispatch.perps.saveApproveData(approveData);
        } else {
          await handleDirectApprove(signActions);
        }

        console.log('loginPerpsAccount success');
        dispatch.perps.setCurrentPerpsAccount(account);
        await wallet.setPerpsCurrentAddress(account.address);
        await dispatch.perps.refreshData();

        return true;
      }
    } catch (error: any) {
      console.error('Failed to login Perps account:', error);
      dispatch.perps.setError(error.message || 'Login failed');
      message.error(error.message || 'Login failed');
    } finally {
      dispatch.perps.setLoading(false);
    }
  });

  const logout = useMemoizedFn(() => {
    dispatch.perps.logout();
    wallet.setPerpsCurrentAddress('');
  });

  const setCurrentPerpsAccount = useMemoizedFn((account: Account | null) => {
    dispatch.perps.setCurrentPerpsAccount(account);
  });

  const handleWithdraw = useMemoizedFn(
    async (amount: number): Promise<boolean> => {
      try {
        console.log('handleWithdraw', amount);
        const sdk = getPerpsSDK();

        if (!currentPerpsAccount) {
          throw new Error('No currentPerpsAccount address');
        }

        if (!sdk.exchange) {
          throw new Error('Hyperliquid no exchange client');
        }

        const action = sdk.exchange.prepareWithdraw({
          amount: amount.toString(),
          destination: currentPerpsAccount.address,
        });
        console.log('withdraw action', action);
        let signature = '';
        if (
          currentPerpsAccount.type === KEYRING_CLASS.PRIVATE_KEY ||
          currentPerpsAccount.type === KEYRING_CLASS.MNEMONIC
        ) {
          signature = await wallet.signTypedData(
            currentPerpsAccount.type,
            currentPerpsAccount.address.toLowerCase(),
            action as any,
            { version: 'V4' }
          );
        } else {
          signature = await wallet.sendRequest({
            method: 'eth_signTypedDataV4',
            params: [currentPerpsAccount.address, action],
          });
        }
        console.log('withdraw signature', signature);
        const res = await sdk.exchange.sendWithdraw({
          action: action.message as any,
          nonce: action.nonce || 0,
          signature: signature as string,
        });
        console.log('withdraw res', res);
        dispatch.perps.fetchClearinghouseState(undefined);
        return true;
      } catch (error) {
        console.error('Failed to withdraw:', error);
        message.error(error.message || 'Withdraw failed');
        return false;
      }
    }
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
    handleWithdraw,
  };
};

export default usePerpsState;
