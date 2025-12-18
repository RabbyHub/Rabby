import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Account } from '@/background/service/preference';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sleep, useWallet } from '@/ui/utils';
import { destroyPerpsSDK, getPerpsSDK } from '../sdkManager';
import * as Sentry from '@sentry/browser';
import {
  PERPS_AGENT_NAME,
  PERPS_BUILD_FEE,
  PERPS_BUILD_FEE_RECEIVE_ADDRESS,
  PERPS_REFERENCE_CODE,
  DELETE_AGENT_EMPTY_ADDRESS,
} from '../constants';
import { isSameAddress } from '@/ui/utils';
import { findAccountByPriority } from '@/utils/account';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useInterval, useMemoizedFn } from 'ahooks';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { message, Modal } from 'antd';
import { MiniTypedData } from '../../Approval/components/MiniSignTypedData/useTypedDataTask';
import {
  supportedDirectSign,
  useStartDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { create, maxBy, minBy } from 'lodash';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { typedDataSignatureStore } from '@/ui/component/MiniSignV2';
type SignActionType = 'approveAgent' | 'approveBuilderFee';

interface SignAction {
  action: any;
  type: SignActionType;
  signature: string;
}

export const usePerpsInitial = () => {
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const { accountsList } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
  }));
  const perpsState = useRabbySelector((state) => state.perps);
  const {
    isInitialized,
    currentPerpsAccount,
    isLogin,
    accountSummary,
    positionAndOpenOrders,
  } = perpsState;

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

  const safeCheckBuilderFee = useMemoizedFn(async () => {
    try {
      const sdk = getPerpsSDK();
      const res = await sdk.info.getMaxBuilderFee(
        PERPS_BUILD_FEE_RECEIVE_ADDRESS
      );
      if (!res && currentPerpsAccount?.address) {
        logout(currentPerpsAccount?.address);
        wallet.createPerpsAgentWallet(currentPerpsAccount?.address);
        console.error('Failed to set builder fee');
        Sentry.captureException(
          new Error(
            'PERPS set builder fee error, no max builder fee' +
              'account: ' +
              JSON.stringify(currentPerpsAccount)
          )
        );
      }
    } catch (error) {
      console.error('Failed to set builder fee:', error);
    }
  });

  const logout = useMemoizedFn((address: string) => {
    dispatch.perps.logout();
    wallet.setPerpsCurrentAccount(null);
    wallet.setSendApproveAfterDeposit(address, []);
  });

  const perpsPositionInfo = useMemo(() => {
    if (
      !isLogin ||
      !positionAndOpenOrders ||
      positionAndOpenOrders.length === 0
    ) {
      return {
        pnl: 0,
        show: false,
      };
    }

    const pnl = positionAndOpenOrders.reduce((acc, order) => {
      return acc + Number(order.position.unrealizedPnl);
    }, 0);

    return {
      pnl,
      show: true,
    };
  }, [positionAndOpenOrders]);

  return {
    accountSummary,
    positionAndOpenOrders,
    isLogin,
    safeCheckBuilderFee,
    perpsPositionInfo,
  };
};

export const usePerpsState = ({
  setDeleteAgentModalVisible,
}: {
  setDeleteAgentModalVisible?: (visible: boolean) => void;
}) => {
  const dispatch = useRabbyDispatch();

  const deleteAgentCbRef = useRef<(() => Promise<void>) | null>(null);

  const perpsState = useRabbySelector((state) => state.perps);
  const {
    isInitialized,
    currentPerpsAccount,
    isLogin,
    positionAndOpenOrders,
    hasPermission,
    accountNeedApproveAgent,
    accountNeedApproveBuilderFee,
  } = perpsState;

  console.log('-----', isInitialized);

  const wallet = useWallet();

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
          duration: 2,
          content: 'Agent is expired, please login again',
        });
        dispatch.perps.setAccountNeedApproveAgent(true);
        return true;
      }
    }
  );

  const handleDeleteAgent = useMemoizedFn(async () => {
    if (deleteAgentCbRef.current) {
      try {
        await deleteAgentCbRef.current();
      } catch (error) {
        message.error({
          // className: 'toast-message-2025-center',
          duration: 2,
          content: error.message || 'Delete agent failed',
        });
      }
      deleteAgentCbRef.current = null;
    }
  });

  const checkExtraAgent = useMemoizedFn(
    async (account, agentAddress: string) => {
      const sdk = getPerpsSDK();
      const extraAgents = await sdk.info.extraAgents(account.address);
      const item = extraAgents.find((agent) =>
        isSameAddress(agent.address, agentAddress)
      );
      if (!item) {
        const existAgentName = extraAgents.find(
          (agent) => agent.name === PERPS_AGENT_NAME
        );
        if (!existAgentName && extraAgents.length >= 3) {
          // 超过3个，需要删除一个
          deleteAgentCbRef.current = async () => {
            const deleteItem = minBy(extraAgents, (agent) => agent.validUntil);
            if (deleteItem) {
              sdk.initAccount(
                account.address,
                DELETE_AGENT_EMPTY_ADDRESS,
                DELETE_AGENT_EMPTY_ADDRESS,
                deleteItem.name
              );
              const action = sdk.exchange?.prepareApproveAgent();
              const signActions: SignAction[] = [
                {
                  action,
                  type: 'approveAgent',
                  signature: '',
                },
              ];
              await executeSignatures(signActions, account);
              const res = await sdk.exchange?.sendApproveAgent({
                action: action?.message,
                nonce: action?.nonce || 0,
                signature: signActions[0].signature,
              });
              console.log('deleteAgent res', res);
            }
          };
          setDeleteAgentModalVisible?.(true);
          return {
            needDelete: true,
            isExpired: true,
          };
        }
        return {
          isExpired: true,
        };
      }

      const expiredAt = item?.validUntil;
      const oneDayAfter = Date.now() + 24 * 60 * 60 * 1000;
      const isExpired = expiredAt ? expiredAt < oneDayAfter : true;
      return {
        isExpired,
      };
    }
  );

  const checkBuilderFee = useMemoizedFn(async (address) => {
    try {
      const sdk = getPerpsSDK();
      const res = await sdk.info.getMaxBuilderFee(
        PERPS_BUILD_FEE_RECEIVE_ADDRESS
      );
      if (!res) {
        dispatch.perps.setAccountNeedApproveBuilderFee(true);
        console.error('Failed to set builder fee');
        Sentry.captureException(
          new Error(
            `PERPS set builder fee error, no max builder fee, address: ${address}`
          )
        );
      }
    } catch (error) {
      console.error('Failed to set builder fee:', error);
    }
  });

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

  const executeSignTypedData = useMemoizedFn(
    async (actions: any[], account: Account) => {
      if (!actions || actions.length === 0) {
        throw new Error('no signature, try later');
      }

      let result: string[] = [];
      await dispatch.account.changeAccountAsync(account);

      if (supportedDirectSign(account.type)) {
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
            },
            wallet,
          },
          {}
        );
        typedDataSignatureStore.close();
      } else {
        for (const actionObj of actions) {
          const signature = await wallet.sendRequest<string>({
            method: 'eth_signTypedDataV4',
            params: [account.address, JSON.stringify(actionObj)],
          });
          result.push(signature);
        }
      }
      return result;
    }
  );

  const executeSignatures = useMemoizedFn(
    async (signActions: SignAction[], account: Account): Promise<void> => {
      const result = await executeSignTypedData(
        signActions.map((item) => item.action),
        account
      );
      signActions.forEach((item, idx) => {
        item.signature = result[idx];
      });
    }
  );

  // useEffect(() => {
  //   if (
  //     perpsState.accountSummary?.withdrawable &&
  //     Number(perpsState.accountSummary.withdrawable) > 0 &&
  //     currentPerpsAccount?.address &&
  //     perpsState.approveSignatures.length > 0
  //   ) {
  //     const directSendApprove = async () => {
  //       const data = perpsState.approveSignatures;
  //       dispatch.perps.setApproveSignatures([]);
  //       await handleDirectApprove(data);
  //       wallet.setSendApproveAfterDeposit(currentPerpsAccount.address, []);
  //     };
  //     directSendApprove();
  //   }
  // }, [perpsState.accountSummary]);

  const handleSafeSetReference = useCallback(async () => {
    try {
      const sdk = getPerpsSDK();
      const res = await sdk.exchange?.setReferrer(PERPS_REFERENCE_CODE);
      console.log('setReference res', res);
    } catch (e) {
      console.log('Failed to set reference:', e);
    }
  }, []);

  const handleDirectApprove = useCallback(
    async (signActions: SignAction[]): Promise<void> => {
      const sdk = getPerpsSDK();

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
            const res = await sdk.exchange?.sendApproveBuilderFee({
              action: action?.message,
              nonce: action?.nonce || 0,
              signature: signature || '',
            });
            return res;
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

  const ensureLoginApproveSign = useMemoizedFn(
    async (account: Account, agentAddress: string) => {
      try {
        const sdk = getPerpsSDK();

        const signActions: SignAction[] = [];

        const [checkResult, maxFee] = await Promise.all([
          checkExtraAgent(account, agentAddress),
          sdk.info.getMaxBuilderFee(PERPS_BUILD_FEE_RECEIVE_ADDRESS),
        ]);
        if (checkResult.needDelete) {
          // 需要删除agent，且重新approve agent和builder fee
          dispatch.perps.setAccountNeedApproveAgent(true);
          !maxFee && dispatch.perps.setAccountNeedApproveBuilderFee(true);
          return;
        }

        if (checkResult.isExpired) {
          const {
            agentAddress: newAgentAddress,
            vault,
          } = await wallet.createPerpsAgentWallet(account.address);
          sdk.initOrUpdateAgent(vault, newAgentAddress, PERPS_AGENT_NAME);
          signActions.push({
            action: sdk.exchange?.prepareApproveAgent(),
            type: 'approveAgent',
            signature: '',
          });
        }

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

        if (signActions.length === 0) {
          dispatch.perps.setAccountNeedApproveAgent(false);
          dispatch.perps.setAccountNeedApproveBuilderFee(false);
          return;
        }

        if (
          account.type === KEYRING_CLASS.PRIVATE_KEY ||
          account.type === KEYRING_CLASS.MNEMONIC
        ) {
          for (const actionObj of signActions) {
            let signature = '';

            signature = await wallet.signTypedData(
              account.type,
              account.address,
              actionObj.action,
              { version: 'V4' }
            );
            actionObj.signature = signature;
          }
          await handleDirectApprove(signActions);
          dispatch.perps.setAccountNeedApproveAgent(false);
          dispatch.perps.setAccountNeedApproveBuilderFee(false);
        } else {
          let needApproveAgent = false;
          let needApproveBuilderFee = false;
          signActions.forEach((item) => {
            if (item.type === 'approveAgent') {
              needApproveAgent = true;
            } else if (item.type === 'approveBuilderFee') {
              needApproveBuilderFee = true;
            }
          });
          dispatch.perps.setAccountNeedApproveAgent(needApproveAgent);
          dispatch.perps.setAccountNeedApproveBuilderFee(needApproveBuilderFee);
        }
      } catch (e) {
        // showToast(String(e), 'error');
        dispatch.perps.setAccountNeedApproveAgent(true);
        dispatch.perps.setAccountNeedApproveBuilderFee(true);
        Sentry.captureException(
          new Error(
            `ensure login approve sign failed, address: ${account.address} , account type: ${account.type} , agentAddress: ${agentAddress} , error: ${e}`
          )
        );
      }
    }
  );

  const isHandlingApproveStatus = useRef(false);

  const handleActionApproveStatus = useMemoizedFn(async () => {
    try {
      if (isHandlingApproveStatus.current) {
        throw new Error('Already handling approve status');
      }
      isHandlingApproveStatus.current = true;

      if (!currentPerpsAccount) {
        throw new Error('No currentPerpsAccount');
      }

      const signActions: SignAction[] = [];
      const sdk = getPerpsSDK();
      if (accountNeedApproveAgent) {
        signActions.push({
          action: sdk.exchange?.prepareApproveAgent(),
          type: 'approveAgent',
          signature: '',
        });
      }

      if (accountNeedApproveBuilderFee) {
        await sleep(10);
        signActions.push({
          action: sdk.exchange?.prepareApproveBuilderFee({
            builder: PERPS_BUILD_FEE_RECEIVE_ADDRESS,
          }),
          type: 'approveBuilderFee',
          signature: '',
        });
      }

      if (signActions.length === 0) {
        isHandlingApproveStatus.current = false;
        return;
      }

      await executeSignatures(signActions, currentPerpsAccount);

      // try {
      await handleDirectApprove(signActions);
      // } catch (error) {}
      dispatch.perps.setAccountNeedApproveAgent(false);
      dispatch.perps.setAccountNeedApproveBuilderFee(false);
      isHandlingApproveStatus.current = false;
    } catch (error) {
      isHandlingApproveStatus.current = false;
      console.error('Failed to handle action approve status:', error);
      // todo fixme maybe no need show toast in prod
      message.error('message' in error ? error.message : String(error));
      Sentry.captureException(
        new Error(
          `Failed to handle action approve status, address: ${currentPerpsAccount?.address} , account type: ${currentPerpsAccount?.type} , error: ${error}`
        )
      );
      throw error;
    }
  });

  const handleSetLaterApproveStatus = useMemoizedFn(
    (signActions: SignAction[]) => {
      signActions.forEach((action) => {
        if (action.type === 'approveAgent') {
          dispatch.perps.setAccountNeedApproveAgent(true);
        } else if (action.type === 'approveBuilderFee') {
          dispatch.perps.setAccountNeedApproveBuilderFee(true);
        }
      });
    }
  );

  const handleLoginWithSignApprove = useMemoizedFn(async (account: Account) => {
    const { agentAddress, vault } = await wallet.createPerpsAgentWallet(
      account.address
    );
    const sdk = getPerpsSDK();
    sdk.initAccount(account.address, vault, agentAddress, PERPS_AGENT_NAME);

    const signActions = await prepareSignActions();

    if (
      account.type === KEYRING_CLASS.PRIVATE_KEY ||
      account.type === KEYRING_CLASS.MNEMONIC
    ) {
      await executeSignatures(signActions, account);

      let isNeedDepositBeforeApprove = true;
      const info = await sdk.info.getClearingHouseState(account.address);
      if ((Number(info?.marginSummary.accountValue) || 0) > 0) {
        isNeedDepositBeforeApprove = false;
      } else {
        const { role } = await sdk.info.getUserRole();
        isNeedDepositBeforeApprove = role === 'missing';
      }

      if (isNeedDepositBeforeApprove) {
        handleSetLaterApproveStatus(signActions);
      } else {
        await handleDirectApprove(signActions);
        dispatch.perps.setAccountNeedApproveAgent(false);
        dispatch.perps.setAccountNeedApproveBuilderFee(false);
      }
    } else {
      let needApproveAgent = false;
      let needApproveBuilderFee = false;
      signActions.forEach((item) => {
        if (item.type === 'approveAgent') {
          needApproveAgent = true;
        } else if (item.type === 'approveBuilderFee') {
          needApproveBuilderFee = true;
        }
      });
      dispatch.perps.setAccountNeedApproveAgent(needApproveAgent);
      dispatch.perps.setAccountNeedApproveBuilderFee(needApproveBuilderFee);
    }

    await dispatch.perps.loginPerpsAccount(account);
  });

  const login = useMemoizedFn(async (account: Account) => {
    try {
      const sdk = getPerpsSDK();
      const res = await wallet.getPerpsAgentWallet(account.address);
      const agentAddress = res?.preference?.agentAddress || '';
      const { isExpired, needDelete } = await checkExtraAgent(
        account,
        agentAddress
      );

      if (needDelete) {
        // 先不登录，防止hl服务状态不同步 return
        return false;
      }

      if (res) {
        // 如果存在 agent wallet, 则检查是否过期
        if (!isExpired) {
          sdk.initAccount(
            account.address,
            res.vault,
            res.preference.agentAddress,
            PERPS_AGENT_NAME
          );
          // 未到过期时间无需签名直接登录即可
          await dispatch.perps.loginPerpsAccount(account);
          dispatch.perps.setAccountNeedApproveAgent(false);
          dispatch.perps.setAccountNeedApproveBuilderFee(false);
          // safeCheckBuilderFee();
          checkBuilderFee(account.address);
        } else {
          // 过期或者没sendApprove过，需要创建新的agent，同时签名
          await handleLoginWithSignApprove(account);
        }
      } else {
        // 不存在agent wallet,，需要创建新的，同时签名
        await handleLoginWithSignApprove(account);
      }
      return true;
    } catch (error: any) {
      console.error('Failed to login Perps account:', error);
      message.error({
        // className: 'toast-message-2025-center',
        duration: 2,
        content: error.message || 'Login failed',
      });
      Sentry.captureException(
        new Error(
          'PERPS Login failed' +
            JSON.stringify({
              error,
            })
        )
      );
    }
  });

  const logout = useMemoizedFn((address: string) => {
    dispatch.perps.logout();
    wallet.setPerpsCurrentAccount(null);
    deleteAgentCbRef.current = null;
    wallet.setSendApproveAfterDeposit(address, []);
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

        const [signature] = await executeSignTypedData(
          [action],
          currentPerpsAccount
        );

        console.log('withdraw signature', signature);
        const res = await sdk.exchange.sendWithdraw({
          action: action.message as any,
          nonce: action.nonce || 0,
          signature: signature as string,
        });
        console.log('withdraw res', res);
        dispatch.perps.setLocalLoadingHistory([
          {
            time: Date.now(),
            hash: res.hash || '',
            type: 'withdraw',
            status: 'pending',
            usdValue: (amount - 1).toString(),
          },
        ]);
        dispatch.perps.fetchClearinghouseState();
        return true;
      } catch (error) {
        console.error('Failed to withdraw:', error);
        message.error({
          // className: 'toast-message-2025-center',
          duration: 2,
          content: error.message || 'Withdraw failed',
        });
        Sentry.captureException(
          new Error(
            'PERPS Withdraw failed' +
              'account: ' +
              JSON.stringify(currentPerpsAccount) +
              'amount: ' +
              amount +
              'error: ' +
              JSON.stringify({
                error,
              })
          )
        );
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

  useEffect(() => {
    if (isInitialized) {
      return;
    }

    const initIsLogin = async () => {
      try {
        const initAccount = perpsState.currentPerpsAccount;
        console.log('initIsLogin', initAccount);
        if (!initAccount) {
          return false;
        }
        const {
          vault,
          agentAddress,
        } = await wallet.getOrCreatePerpsAgentWallet(initAccount.address);
        const sdk = getPerpsSDK();
        // 开始恢复登录态
        sdk.initAccount(
          initAccount.address,
          vault,
          agentAddress,
          PERPS_AGENT_NAME
        );
        await dispatch.perps.loginPerpsAccount(initAccount);
        dispatch.perps.fetchMarketData(undefined);

        // checkIsNeedAutoLoginOut(initAccount.address, agentAddress);
        ensureLoginApproveSign(initAccount, agentAddress);

        dispatch.perps.setInitialized(true);
        return true;
      } catch (error) {
        console.error('Failed to init Perps state:', error);
      }
    };

    initIsLogin();
  }, [wallet, dispatch, isInitialized]);

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
    hasPermission: perpsState.hasPermission,
    homeHistoryList,
    localLoadingHistory: perpsState.localLoadingHistory,
    perpFee: perpsState.perpFee,
    accountNeedApproveAgent: perpsState.accountNeedApproveAgent,
    accountNeedApproveBuilderFee: perpsState.accountNeedApproveBuilderFee,

    // Actions
    login,
    logout,
    handleWithdraw,

    handleDeleteAgent,

    judgeIsUserAgentIsExpired,
    handleActionApproveStatus,
  };
};

export default usePerpsState;
