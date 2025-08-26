import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Account } from '@/background/service/preference';
import { useCallback, useEffect, useMemo } from 'react';
import { useWallet } from '@/ui/utils';
import { getPerpsSDK, initPerpsSDK } from './sdkManager';
import {
  PERPS_AGENT_NAME,
  PERPS_BUILD_FEE_RECEIVE_ADDRESS,
  PERPS_REFERENCE_CODE,
} from './constants';
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

export const usePerpsState = () => {
  const dispatch = useRabbyDispatch();
  const perpsState = useRabbySelector((state) => state.perps);
  const {
    isInitialized,
    currentPerpsAccount,
    isLogin,
    positionAndOpenOrders,
  } = perpsState;
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

  // return bool if can use approveSignatures
  const restoreApproveSignatures = useMemoizedFn(
    async (payload: { address: string }) => {
      const approveSignatures = await wallet.getSendApproveAfterDeposit(
        payload.address
      );

      console.log('getSendApproveAfterDeposit res', approveSignatures);
      if (approveSignatures?.length) {
        const item = approveSignatures[0];
        const expiredTime = item.nonce + 1000 * 60 * 60 * 24;
        const now = Date.now();
        if (expiredTime > now) {
          dispatch.perps.setApproveSignatures(approveSignatures);
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  );

  console.log('approveSignatures', perpsState.approveSignatures);

  const checkIsNeedAutoLoginOut = useMemoizedFn(
    async (masterAddress: string, agentAddress: string) => {
      const sdk = getPerpsSDK();
      const extraAgents = await sdk.info.extraAgents(masterAddress);
      const item = extraAgents.find((agent) =>
        isSameAddress(agent.address, agentAddress)
      );
      if (!item) {
        const res = await restoreApproveSignatures({
          address: masterAddress,
        });
        if (!res) {
          console.warn(
            'masterAddress isExpired, no restore approve signature, logout'
          );
          logout(masterAddress);
        }
      } else {
        const expiredAt = item?.validUntil;
        const oneDayAfter = Date.now() + 24 * 60 * 60 * 1000;
        const isExpired = expiredAt ? expiredAt < oneDayAfter : true;
        if (isExpired) {
          console.warn('masterAddress isExpired, update agent, auto login out');
          // need to update agent for send new approve agent api avoid error
          wallet.createPerpsAgentWallet(masterAddress);
          logout(masterAddress);
        }
      }
    }
  );

  useEffect(() => {
    if (isInitialized && isLogin) {
      // 已经初始化完成 且 已经登录
      dispatch.perps.fetchClearinghouseState(undefined);
      return;
    }

    if (isInitialized) {
      return;
    }

    const initIsLogin = async () => {
      try {
        const noLoginAction = () => {
          wallet.setPerpsCurrentAddress('');
          dispatch.perps.fetchMarketData(true);
          dispatch.perps.setInitialized(true);
          initPerpsSDK({
            masterAddress: '',
            agentPrivateKey: '',
            agentPublicKey: '',
            agentName: '',
          });
        };

        const currentAddress = await wallet.getPerpsCurrentAddress();
        console.log(' init currentAddress', currentAddress);
        if (!currentAddress) {
          // 如果没有登录状态，则只获取市场数据即可
          noLoginAction();
          return false;
        }

        const list = accountsList.filter(
          (acc: any) =>
            acc.type !== KEYRING_CLASS.WATCH &&
            acc.type !== KEYRING_CLASS.GNOSIS
        );

        const targetTypeAccount = findAccountByPriority(
          list.filter((acc: any) => isSameAddress(acc.address, currentAddress))
        );

        if (!targetTypeAccount) {
          // 地址列表没找到
          noLoginAction();
          return false;
        }

        const res = await wallet.getPerpsAgentWallet(currentAddress);
        if (!res) {
          // 没有找到store对应的 agent wallet
          noLoginAction();
          return false;
        }

        // 开始恢复登录态
        initPerpsSDK({
          masterAddress: currentAddress,
          agentPrivateKey: res.vault,
          agentPublicKey: res.preference.agentAddress || '',
          agentName: PERPS_AGENT_NAME,
        });

        dispatch.perps.fetchMarketData(true);

        await dispatch.perps.loginPerpsAccount(targetTypeAccount);

        checkIsNeedAutoLoginOut(currentAddress, res.preference.agentAddress);

        setTimeout(() => {
          // is not very matter, just wait for the other query api
          dispatch.perps.fetchPerpFee();
        }, 2000);

        dispatch.perps.setInitialized(true);
        return true;
      } catch (error) {
        console.error('Failed to init Perps state:', error);
      }
    };

    initIsLogin();
  }, [wallet, dispatch, isInitialized]);

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

  useEffect(() => {
    if (
      perpsState.accountSummary?.withdrawable &&
      Number(perpsState.accountSummary.withdrawable) > 0 &&
      currentPerpsAccount?.address &&
      perpsState.approveSignatures.length > 0
    ) {
      const directSendApprove = async () => {
        const data = perpsState.approveSignatures;
        dispatch.perps.setApproveSignatures([]);
        await handleDirectApprove(data);
        wallet.setSendApproveAfterDeposit(currentPerpsAccount.address, []);
      };
      directSendApprove();
    }
  }, [perpsState.accountSummary]);

  const handleSafeSetReference = useCallback(async () => {
    try {
      const sdk = getPerpsSDK();
      const res = await sdk.exchange?.setReferrer(PERPS_REFERENCE_CODE);
      console.log('setReference res', res);
    } catch (e) {
      console.error('Failed to set reference:', e);
    }
  }, []);

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
            return sdk.exchange?.sendApproveBuilderFee({
              action: action?.message,
              nonce: action?.nonce || 0,
              signature,
            });
          }
        })
      );

      setTimeout(() => {
        handleSafeSetReference();
      }, 500);
      const [approveAgentRes, approveBuilderFeeRes] = results;
      console.log('sendApproveAgentRes', approveAgentRes);
      console.log('sendApproveBuilderFeeRes', approveBuilderFeeRes);
    },
    [handleSafeSetReference]
  );

  const handleLoginWithSignApprove = useMemoizedFn(async (account: Account) => {
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
      // 新地址，需要先deposit后才能 send approve
      const approveSignatures = signActions.map((action) => {
        return {
          action: action.action,
          nonce: action.action?.nonce || 0,
          signature: action.signature,
          type: action.type,
        };
      });
      dispatch.perps.saveApproveSignatures({
        approveSignatures,
        address: account.address,
      });
    } else {
      await handleDirectApprove(signActions);
    }

    await dispatch.perps.loginPerpsAccount(account);
  });

  const loginPerpsAccount = useMemoizedFn(async (account: Account) => {
    try {
      // const { privateKey, publicKey } = await getOrCreateAgentWallet(account);
      const res = await wallet.getPerpsAgentWallet(account.address);
      if (res) {
        // 如果存在 agent wallet, 则检查是否过期
        const isExpired = await checkIsExtraAgentIsExpired(
          account.address,
          res.preference.agentAddress
        );
        if (!isExpired) {
          initPerpsSDK({
            masterAddress: account.address,
            agentPrivateKey: res.vault,
            agentPublicKey: res.preference.agentAddress,
            agentName: PERPS_AGENT_NAME,
          });
          // 未到过期时间无需签名直接登录即可
          await dispatch.perps.loginPerpsAccount(account);
        } else {
          // 过期或者没sendApprove过，需要创建新的agent，同时签名
          await handleLoginWithSignApprove(account);

          await dispatch.perps.loginPerpsAccount(account);
        }
      } else {
        // 不存在agent wallet,，需要创建新的，同时签名
        await handleLoginWithSignApprove(account);

        await dispatch.perps.loginPerpsAccount(account);
      }
      return true;
    } catch (error: any) {
      console.error('Failed to login Perps account:', error);
      message.error(error.message || 'Login failed');
    }
  });

  const logout = useMemoizedFn((address: string) => {
    dispatch.perps.logout();
    wallet.setPerpsCurrentAddress('');
    wallet.setSendApproveAfterDeposit(address, []);
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

  const homeHistoryList = useMemo(() => {
    const list = [
      ...perpsState.localLoadingHistory,
      ...perpsState.userAccountHistory,
      ...perpsState.userFills,
    ];

    return list.sort((a, b) => b.time - a.time);
  }, [
    perpsState.userAccountHistory,
    perpsState.userFills,
    perpsState.localLoadingHistory,
  ]);

  return {
    // State
    marketData: perpsState.marketData,
    marketDataMap: perpsState.marketDataMap,
    positionAndOpenOrders: perpsState.positionAndOpenOrders,
    accountSummary: perpsState.accountSummary,
    currentPerpsAccount: perpsState.currentPerpsAccount,
    isLogin: perpsState.isLogin,
    isInitialized: perpsState.isInitialized,
    userFills: perpsState.userFills,
    homeHistoryList,

    // Actions
    loginPerpsAccount,
    logout,
    setCurrentPerpsAccount,
    handleWithdraw,
    refreshData: dispatch.perps.refreshData,
  };
};

export default usePerpsState;
