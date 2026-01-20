import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Account } from '@/background/service/preference';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sleep, useWallet } from '@/ui/utils';
import { typedDataSignatureStore } from '@/ui/component/MiniSignV2';
import * as Sentry from '@sentry/browser';
import {
  PERPS_AGENT_NAME,
  PERPS_BUILD_FEE,
  PERPS_BUILD_FEE_RECEIVE_ADDRESS,
  PERPS_REFERENCE_CODE,
  DELETE_AGENT_EMPTY_ADDRESS,
} from '../../Perps/constants';
import { isSameAddress } from '@/ui/utils';
import { findAccountByPriority } from '@/utils/account';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useInterval, useMemoizedFn } from 'ahooks';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { message } from 'antd';
import { MiniTypedData } from '../../Approval/components/MiniSignTypedData/useTypedDataTask';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { create, maxBy, minBy } from 'lodash';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { getPerpsSDK } from '../../Perps/sdkManager';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { openDeleteAgentModal } from '../utils/openDeleteAgentModal';
import perpsToast from '../components/PerpsToast';
type SignActionType = 'approveAgent' | 'approveBuilderFee';

export interface SignAction {
  action: any;
  type: SignActionType;
  signature: string;
}

export const usePerpsProState = () => {
  const dispatch = useRabbyDispatch();
  const { isDarkTheme } = useThemeMode();

  const perpsState = useRabbySelector((state) => state.perps);
  const {
    isInitialized,
    currentPerpsAccount,
    isLogin,
    positionAndOpenOrders,
    hasPermission,
    accountNeedApproveAgent,
    accountNeedApproveBuilderFee,
    selectedCoin,
  } = perpsState;

  const wallet = useWallet();

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
          const handleDeleteAgent = async () => {
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

          openDeleteAgentModal({
            isDarkTheme,
            onConfirm: handleDeleteAgent,
          });
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

      if (
        account.type === KEYRING_CLASS.PRIVATE_KEY ||
        account.type === KEYRING_CLASS.MNEMONIC
      ) {
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

  const needEnableTrading = useMemo(() => {
    return accountNeedApproveAgent || accountNeedApproveBuilderFee;
  }, [accountNeedApproveAgent, accountNeedApproveBuilderFee]);

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

      try {
        await handleDirectApprove(signActions);
      } catch (error) {
        // no throw error to avoid block
        console.error('Failed to handle direct approve:', error);
      }
      dispatch.perps.setAccountNeedApproveAgent(false);
      dispatch.perps.setAccountNeedApproveBuilderFee(false);
      isHandlingApproveStatus.current = false;
    } catch (error) {
      isHandlingApproveStatus.current = false;
      console.error('Failed to handle action approve status:', error);
      // todo fixme maybe no need show toast in prod
      perpsToast.error({
        title: 'Failed to enable trading',
        description: 'message' in error ? error.message : String(error),
      });
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
        setTimeout(() => {
          handleSafeSetReference();
        }, 500);
        dispatch.perps.setAccountNeedApproveAgent(false);
        dispatch.perps.setAccountNeedApproveBuilderFee(false);
      }
    } else {
      // just test
      // await executeSignatures(signActions, account);

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

    dispatch.perps.setCurrentPerpsAccount(account);
    await dispatch.perps.loginPerpsAccount({
      account,
      isPro: true,
    });
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
          dispatch.perps.setCurrentPerpsAccount(account);
          await dispatch.perps.loginPerpsAccount({
            account,
            isPro: true,
          });
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
      // todo 重构这里的逻辑
      // 切换账号后，清空本地历史记录，避免数据错乱
      dispatch.perps.clearLocalLoadingHistory();
      return true;
    } catch (error: any) {
      console.error('Failed to login Perps account:', error);
      perpsToast.error({
        // className: 'toast-message-2025-center',
        title: 'Switch account failed',
        description: error.message || 'Login failed',
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
  });

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
    perpFee: perpsState.perpFee,
    accountNeedApproveAgent: perpsState.accountNeedApproveAgent,
    accountNeedApproveBuilderFee: perpsState.accountNeedApproveBuilderFee,

    // Actions
    login,
    logout,
    handleActionApproveStatus,
    needEnableTrading,
    handleSafeSetReference,

    ensureLoginApproveSign,
    executeSignatures,
  };
};

export default usePerpsProState;
