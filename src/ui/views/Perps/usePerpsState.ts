import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Account } from '@/background/service/preference';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@/ui/utils';
import { destroyPerpsSDK, getPerpsSDK } from './sdkManager';
import * as Sentry from '@sentry/browser';
import {
  PERPS_AGENT_NAME,
  PERPS_BUILD_FEE,
  PERPS_BUILD_FEE_RECEIVE_ADDRESS,
  PERPS_REFERENCE_CODE,
  DELETE_AGENT_EMPTY_ADDRESS,
} from './constants';
import { isSameAddress } from '@/ui/utils';
import { findAccountByPriority } from '@/utils/account';
import { KEYRING_CLASS } from '@/constant';
import { useInterval, useMemoizedFn } from 'ahooks';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { message, Modal } from 'antd';
import { MiniTypedData } from '../Approval/components/MiniSignTypedData/useTypedDataTask';
import { useStartDirectSigning } from '@/ui/hooks/useMiniApprovalDirectSign';
import { create, maxBy, minBy } from 'lodash';
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
          Sentry.captureException(
            new Error(
              'masterAddress isExpired, no restore approve signature, logout' +
                masterAddress
            )
          );
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
          Sentry.captureException(
            new Error(
              'masterAddress isExpired, update agent, auto login out' +
                masterAddress
            )
          );
        }
      }
    }
  );

  const safeSetBuilderFee = useMemoizedFn(async () => {
    const sdk = getPerpsSDK();
    const res = await sdk.info.getMaxBuilderFee(
      PERPS_BUILD_FEE_RECEIVE_ADDRESS
    );
    if (res) {
      sdk.exchange?.updateBuilder(
        PERPS_BUILD_FEE_RECEIVE_ADDRESS,
        PERPS_BUILD_FEE
      );
    }
  });

  useEffect(() => {
    if (isInitialized) {
      return;
    }

    const initIsLogin = async () => {
      try {
        const noLoginAction = async () => {
          wallet.setPerpsCurrentAccount(null);
          dispatch.perps.fetchPerpPermission('');
          await dispatch.perps.fetchMarketData(undefined);
          dispatch.perps.setInitialized(true);
        };

        const currentAccount = await wallet.getPerpsCurrentAccount();
        console.log(' init currentAccount', currentAccount);
        if (!currentAccount || !currentAccount.address) {
          // 如果没有登录状态，则只获取市场数据即可
          console.log('noLoginAction no currentAccount');
          await noLoginAction();
          return false;
        }
        const targetTypeAccount = accountsList.find(
          (acc) =>
            isSameAddress(acc.address, currentAccount.address) &&
            acc.type === currentAccount.type
        );

        if (!targetTypeAccount) {
          // 地址列表没找到
          console.log('noLoginAction no targetTypeAccount');
          await noLoginAction();
          return false;
        }

        const res = await wallet.getPerpsAgentWallet(currentAccount.address);
        if (!res) {
          // 没有找到store对应的 agent wallet
          console.log('noLoginAction no PerpsAgentWallet');
          await noLoginAction();
          return false;
        }

        const sdk = getPerpsSDK();
        // 开始恢复登录态
        sdk.initAccount(
          currentAccount.address,
          res.vault,
          res.preference.agentAddress,
          PERPS_AGENT_NAME
        );
        safeSetBuilderFee();
        await dispatch.perps.loginPerpsAccount(targetTypeAccount);
        await dispatch.perps.fetchMarketData(undefined);

        checkIsNeedAutoLoginOut(
          currentAccount.address,
          res.preference.agentAddress
        );

        dispatch.perps.setInitialized(true);
        return true;
      } catch (error) {
        console.error('Failed to init Perps state:', error);
      }
    };

    initIsLogin();
  }, [wallet, dispatch, isInitialized]);

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
    safeSetBuilderFee,
    perpsPositionInfo,
  };
};

interface MiniTypedDataWithAccount {
  data: MiniTypedData[];
  account: Account | null;
}

export const usePerpsState = ({
  setDeleteAgentModalVisible,
}: {
  setDeleteAgentModalVisible?: (visible: boolean) => void;
}) => {
  const dispatch = useRabbyDispatch();
  const [
    miniSignTypeData,
    setMiniSignTypeData,
  ] = useState<MiniTypedDataWithAccount>({
    data: [],
    account: null,
  });
  const startDirectSigning = useStartDirectSigning();
  const deleteAgentCbRef = useRef<(() => Promise<void>) | null>(null);
  const { safeSetBuilderFee } = usePerpsInitial();

  const clearMiniSignTypeData = useMemoizedFn(() => {
    setMiniSignTypeData({
      data: [],
      account: null,
    });
  });

  const miniSignPromiseRef = useRef<{
    resolve: (result: string[]) => void;
    reject: (error: any) => void;
  } | null>(null);

  const waitForMiniSignResult = useMemoizedFn(
    (): Promise<string[]> => {
      return new Promise((resolve, reject) => {
        miniSignPromiseRef.current = { resolve, reject };
      });
    }
  );

  const handleMiniSignResolve = useMemoizedFn((result: string[]) => {
    if (miniSignPromiseRef.current) {
      clearMiniSignTypeData();
      miniSignPromiseRef.current.resolve(result);
      miniSignPromiseRef.current = null;
    }
  });

  const handleMiniSignReject = useMemoizedFn((error?: any) => {
    if (miniSignPromiseRef.current) {
      clearMiniSignTypeData();
      miniSignPromiseRef.current.reject(error || new Error('User rejected'));
      miniSignPromiseRef.current = null;
    }
  });
  const perpsState = useRabbySelector((state) => state.perps);
  const {
    isInitialized,
    currentPerpsAccount,
    isLogin,
    positionAndOpenOrders,
    hasPermission,
  } = perpsState;

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
        message.error('Agent is expired, please login again');
        logout(masterAddress);
        return true;
      }
    }
  );

  const handleDeleteAgent = useMemoizedFn(async () => {
    if (deleteAgentCbRef.current) {
      try {
        await deleteAgentCbRef.current();
      } catch (error) {
        message.error(error.message || 'Delete agent failed');
      }
      deleteAgentCbRef.current = null;
    }
  });

  const checkIsExtraAgentIsExpired = useMemoizedFn(
    async (account, agentAddress: string) => {
      const sdk = getPerpsSDK();
      const extraAgents = await sdk.info.extraAgents(account.address);
      const item = extraAgents.find((agent) =>
        isSameAddress(agent.address, agentAddress)
      );
      if (!item) {
        if (extraAgents.length >= 3) {
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
      } else {
        sdk.exchange?.updateBuilder(
          PERPS_BUILD_FEE_RECEIVE_ADDRESS,
          PERPS_BUILD_FEE
        );
      }

      return signActions;
    }
  );

  const executeSignatures = useMemoizedFn(
    async (signActions: SignAction[], account: Account): Promise<void> => {
      if (!signActions || signActions.length === 0) {
        throw new Error('no signature, try later');
      }

      await dispatch.account.changeAccountAsync(account);
      const isLocalWallet =
        account.type === KEYRING_CLASS.PRIVATE_KEY ||
        account.type === KEYRING_CLASS.MNEMONIC;

      const useMiniApprovalSign =
        account.type === KEYRING_CLASS.HARDWARE.ONEKEY ||
        account.type === KEYRING_CLASS.HARDWARE.LEDGER;

      if (useMiniApprovalSign) {
        setMiniSignTypeData({
          data: signActions.map((item) => {
            return {
              data: item.action,
              from: account.address,
              version: 'V4',
            };
          }),
          account,
        });
        startDirectSigning();
        // avoid the mini sign modal is not shown
        setTimeout(() => {
          startDirectSigning();
        }, 500);
        // await MiniTypedDataApproval in home page
        const result = await waitForMiniSignResult();
        console.log('Mini sign result', result);
        result.forEach((item, idx) => {
          signActions[idx].signature = item;
        });
      } else {
        for (const actionObj of signActions) {
          let signature = '';

          if (isLocalWallet) {
            signature = await wallet.signTypedData(
              account.type,
              account.address,
              actionObj.action,
              { version: 'V4' }
            );
          } else {
            signature = await wallet.sendRequest({
              method: 'eth_signTypedDataV4',
              params: [account.address, JSON.stringify(actionObj.action)],
            });
          }
          actionObj.signature = signature;
        }
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
            res &&
              sdk.exchange?.updateBuilder(
                PERPS_BUILD_FEE_RECEIVE_ADDRESS,
                PERPS_BUILD_FEE
              );
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

  const handleLoginWithSignApprove = useMemoizedFn(async (account: Account) => {
    const { agentAddress, vault } = await wallet.createPerpsAgentWallet(
      account.address
    );
    const sdk = getPerpsSDK();
    sdk.initAccount(account.address, vault, agentAddress, PERPS_AGENT_NAME);

    const signActions = await prepareSignActions();

    try {
      await executeSignatures(signActions, account);
    } catch (error) {
      // catch the sign error and return
      console.error('Failed to execute signatures:', error);
      return;
    }

    if (signActions.some((action) => !action.signature)) {
      Sentry.captureException(
        new Error(
          'PERPS Login failed, some signature is empty' +
            'account: ' +
            JSON.stringify(account) +
            'signActions: ' +
            JSON.stringify({
              signActions,
            })
        )
      );
      return;
    }

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

  const login = useMemoizedFn(async (account: Account) => {
    try {
      // const { privateKey, publicKey } = await getOrCreateAgentWallet(account);
      const sdk = getPerpsSDK();
      const res = await wallet.getPerpsAgentWallet(account.address);
      if (res) {
        // 如果存在 agent wallet, 则检查是否过期
        const { isExpired, needDelete } = await checkIsExtraAgentIsExpired(
          account,
          res.preference.agentAddress
        );
        if (needDelete) {
          // 先不登录，防止hl服务状态不同步
          return false;
        }
        if (!isExpired) {
          sdk.initAccount(
            account.address,
            res.vault,
            res.preference.agentAddress,
            PERPS_AGENT_NAME
          );
          safeSetBuilderFee();
          // 未到过期时间无需签名直接登录即可
          await dispatch.perps.loginPerpsAccount(account);
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
      message.error(error.message || 'Login failed');
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
        const useMiniApprovalSign =
          currentPerpsAccount.type === KEYRING_CLASS.HARDWARE.ONEKEY ||
          currentPerpsAccount.type === KEYRING_CLASS.HARDWARE.LEDGER;
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
        } else if (useMiniApprovalSign) {
          setMiniSignTypeData({
            data: [
              {
                data: action,
                from: currentPerpsAccount.address,
                version: 'V4',
              },
            ],
            account: currentPerpsAccount,
          });
          startDirectSigning();
          // avoid the mini sign modal is not shown
          setTimeout(() => {
            startDirectSigning();
          }, 500);
          try {
            const result = await waitForMiniSignResult();
            signature = result[0];
          } catch (error) {
            console.error('Failed to get mini sign result:', error);
            return false;
          }
        } else {
          signature = await wallet.sendRequest({
            method: 'eth_signTypedDataV4',
            params: [currentPerpsAccount.address, JSON.stringify(action)],
          });
        }
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
        message.error(error.message || 'Withdraw failed');
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
    perpFee: perpsState.perpFee,

    // Actions
    login,
    logout,
    handleWithdraw,

    // hard ware sign typeData
    miniSignTypeData,
    clearMiniSignTypeData,
    handleMiniSignResolve,
    handleMiniSignReject,

    handleDeleteAgent,

    judgeIsUserAgentIsExpired,
  };
};

export default usePerpsState;
