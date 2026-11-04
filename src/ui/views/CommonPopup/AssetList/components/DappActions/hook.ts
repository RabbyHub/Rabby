import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { isSameAddress, useWallet } from '@/ui/utils';
import {
  PortfolioItem,
  Tx,
  WithdrawAction,
} from '@rabby-wallet/rabby-api/dist/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { findLast } from 'lodash';
import {
  BLACKLIST_METHODS,
  WHITELIST_ADDRESS,
  WHITELIST_SPENDER,
} from './constant';
import { AbiFunction, encodeFunctionData, parseAbiItem } from 'viem';
import { findChain } from '@/utils/chain';
import { isValidAddress } from '@ethereumjs/util';
import PQueue from 'p-queue';
import { CHAINS_ENUM, ETH_USDT_CONTRACT } from '@/constant';
import BigNumber from 'bignumber.js';
import { DisplayedProject } from '@/ui/utils/portfolio/project';
import { ActionType } from './DappActionsForPopup';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/browser';

const rpcQueue = new PQueue({
  concurrency: 20,
  interval: 1000,
  intervalCap: 10,
});

const BLACKLIST_METHOD_SET = new Set(
  BLACKLIST_METHODS.map((name) => name.toLowerCase())
);

// Name parsed for encodeFunctionData. That name is what tx.data's selector is built from.
// Any parameter overload of these names is blocked.
export const isBlacklistMethodName = (name: string) => {
  return BLACKLIST_METHOD_SET.has(name.toLowerCase());
};

export const isWhitelistAddress = (address: string) => {
  return WHITELIST_ADDRESS.some((item) => isSameAddress(item, address));
};

export const isWhitelistSpender = (address: string, chain: string) => {
  return WHITELIST_SPENDER.some(
    (item) =>
      isSameAddress(item.address, address) &&
      item.chain.toLowerCase() === chain.toLowerCase()
  );
};

const cacheMap = new Map<string, boolean>();
export const useIsContractBySymbol = () => {
  const wallet = useWallet();
  return async (address: string, serverId?: string) => {
    const key = `${address}-${serverId}`;
    if (cacheMap.has(key)) {
      return cacheMap.get(key);
    }
    try {
      // symbol call
      if (!serverId) return false;
      if (!isValidAddress(address)) return false;
      const data = '0x95d89b41';
      const ret = await rpcQueue.add(() =>
        wallet.requestETHRpc<string>(
          {
            method: 'eth_call',
            params: [
              {
                to: address,
                data,
              },
              'latest',
            ],
          },
          serverId
        )
      );

      const result = !!ret && ret !== '0x' && ret !== '0x0';
      cacheMap.set(key, result);
      return result;
    } catch (e) {
      return false;
    }
  };
};

export const getMethodDesc = (fncName: string) => {
  if (fncName.trim().startsWith('function ')) {
    return fncName;
  }
  const normalizedName = fncName.trim();
  // 移除最后一个括号及其内容
  return `function ${normalizedName.split(')(')[0] + ')'}`;
};

const getPortfolioPositionId = (item: PortfolioItem) =>
  `${item.pool?.id || ''}${item.position_index || ''}`;

export const findTypedWithdrawAction = (
  actions: WithdrawAction[] | undefined,
  type: 'withdraw' | 'claim'
) =>
  actions?.find(
    (item) =>
      item.type === type ||
      (type === 'withdraw' && item.type === ActionType.Queue)
  );

export const useDappActionRequest = (
  portfolio: PortfolioItem,
  buildTxs: (action: WithdrawAction) => Promise<Tx[]>
) => {
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = async (
    type: 'withdraw' | 'claim',
    submit: (txs: Tx[], actionType: WithdrawAction['type']) => Promise<void>
  ) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      const protocolId = portfolio.pool?.project_id;
      const positionId = getPortfolioPositionId(portfolio);
      if (!protocolId || !positionId || !currentAccount?.address) {
        throw new Error('Portfolio protocol refresh is unavailable');
      }
      const res = await wallet.openapi.getProtocol({
        addr: currentAccount.address,
        id: protocolId,
      });
      // DisplayedProject keeps the last portfolio when ids collide.
      const freshPortfolio = findLast(
        res?.portfolio_item_list,
        (item) => getPortfolioPositionId(item) === positionId
      );
      const action = findTypedWithdrawAction(
        freshPortfolio?.withdraw_actions,
        type
      );
      if (!action || freshPortfolio?.proxy_detail?.proxy_contract_id) {
        throw new Error('Withdraw action is unavailable');
      }
      await submit(await buildTxs(action), action.type);
    } catch (error) {
      console.error('Dapp action preparation failed', error);
      message.error('Failed to prepare the transaction. Please try again.');
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  return { pending, run };
};

export const buildActionCalldata = (func: string, strParams?: string[]) => {
  const normalizedFunc = getMethodDesc(func);
  const abi = parseAbiItem(normalizedFunc) as AbiFunction;
  const calldata = encodeFunctionData({
    abi: [abi],
    functionName: abi.name,
    args: strParams as any[],
  });
  return { abi, calldata };
};

export const useDappAction = (
  data: WithdrawAction | undefined,
  chain?: string,
  protocolName?: string
) => {
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();
  const [valid, setValid] = useState(false);
  const isErc20Contract = useIsContractBySymbol();

  const chainInfo = useMemo(() => {
    return findChain({
      serverId: chain,
    });
  }, [chain]);

  const validate = useCallback(
    async (source: WithdrawAction, abi: AbiFunction) => {
      if (
        !chain ||
        (source.need_approve?.to &&
          !isWhitelistSpender(source.need_approve.to, chain)) ||
        isBlacklistMethodName(abi.name)
      ) {
        return false;
      }
      const addresses =
        source.str_params?.filter(
          (item, index) => !!item && abi.inputs[index]?.type === 'address'
        ) || [];
      if (!addresses.length) return true;
      const results = await Promise.all(
        addresses.map(async (addr) => {
          if (
            currentAccount?.address &&
            isSameAddress(currentAccount.address, addr)
          ) {
            return true;
          }
          if (isWhitelistAddress(addr)) return true;
          return isErc20Contract(addr, chain);
        })
      );
      return results.every((item) => item);
    },
    [chain, currentAccount?.address, isErc20Contract]
  );

  useEffect(() => {
    if (!data || !chain) {
      setValid(false);
      return;
    }

    let isMounted = true;

    const run = async () => {
      try {
        const { abi } = buildActionCalldata(data.func, data.str_params);
        const passed = await validate(data, abi);
        if (isMounted) {
          setValid(passed);
        }
      } catch (error) {
        // ignore error and hide actions
        if (isMounted) {
          setValid(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [chain, data, validate]);

  const buildApproveTxs = useCallback(
    async (source: WithdrawAction): Promise<Tx[]> => {
      const resTxs: Tx[] = [];
      if (
        !currentAccount?.address ||
        !chainInfo?.id ||
        !source?.need_approve?.to ||
        !source?.need_approve?.token_id ||
        !source?.need_approve?.str_raw_amount
      ) {
        return [];
      }

      let tokenApproved = false;
      let allowance = '0';
      if (source.need_approve.to === chainInfo?.nativeTokenAddress) {
        tokenApproved = true;
      } else {
        try {
          allowance = await wallet.getERC20Allowance(
            chainInfo.serverId,
            source.need_approve.token_id,
            source.need_approve.to
          );
          tokenApproved = new BigNumber(allowance).gte(
            new BigNumber(source.need_approve.str_raw_amount || '0')
          );
        } catch (error) {
          // ignore error, default to not approved
        }
      }
      let shouldTwoStepApprove = false;
      if (
        chainInfo?.enum === CHAINS_ENUM.ETH &&
        isSameAddress(source.need_approve.to, ETH_USDT_CONTRACT) &&
        Number(allowance) !== 0 &&
        !tokenApproved
      ) {
        shouldTwoStepApprove = true;
      }
      if (shouldTwoStepApprove) {
        const res = await wallet.approveToken(
          chainInfo.serverId,
          source.need_approve.token_id,
          source.need_approve.to,
          0,
          {
            ga: {
              category: 'Security',
              source: 'tokenApproval',
            },
          },
          undefined,
          undefined,
          true
        );
        resTxs.push(res.params[0]);
      }
      if (!tokenApproved) {
        const res = await wallet.approveToken(
          chainInfo.serverId,
          source.need_approve.token_id,
          source.need_approve.to,
          source.need_approve.str_raw_amount || '0',
          {
            ga: {
              category: 'Security',
              source: 'tokenApproval',
            },
          },
          undefined,
          undefined,
          true
        );
        resTxs.push(res.params[0]);
      }

      return resTxs;
    },
    [
      currentAccount?.address,
      chainInfo?.id,
      chainInfo?.nativeTokenAddress,
      chainInfo?.enum,
      chainInfo?.serverId,
      wallet,
    ]
  );

  const action = useCallback(
    async (source: WithdrawAction): Promise<Tx[]> => {
      if (!source || !chain || !currentAccount?.address || !chainInfo?.id) {
        throw new Error('Withdraw action context is unavailable');
      }

      let calldata: `0x${string}`;
      let abi: AbiFunction;
      let expectedParamCount: number | undefined;
      try {
        const built = buildActionCalldata(source.func, source.str_params);
        expectedParamCount = built.abi.inputs.length;
        abi = built.abi;
        calldata = built.calldata;
      } catch (error) {
        const errorName =
          error instanceof Error && error.name ? error.name : 'UnknownError';

        Sentry.captureException(
          new Error(`DappAction parameter encoding failed: ${errorName}`),
          {
            tags: {
              feature: 'dapp_action',
              error_stage: 'encode_params',
              protocol_name: protocolName || 'unknown',
              chain_id: String(chainInfo.id),
              chain_server_id: chainInfo.serverId,
              action_type: source.type,
              original_error_name: errorName,
            },
            fingerprint: ['dapp-action', 'encode-params', errorName],
            extra: {
              function_signature: source.func,
              expected_param_count: expectedParamCount,
              actual_param_count: source.str_params?.length || 0,
            },
          }
        );
        throw error;
      }

      const passed = await validate(source, abi);
      if (!passed) {
        throw new Error('Withdraw action validation failed');
      }

      const tx = {
        chainId: chainInfo.id,
        from: currentAccount.address,
        to: source.contract_id,
        value: '0x0',
        data: calldata,
      } as any;

      const approve_txs = await buildApproveTxs(source);

      return [...approve_txs, tx];
    },
    [
      chain,
      currentAccount?.address,
      chainInfo?.id,
      chainInfo?.serverId,
      buildApproveTxs,
      protocolName,
      validate,
    ]
  );

  return {
    valid,
    action,
  };
};

export const useGetDappActions = ({
  protocol,
}: {
  protocol: DisplayedProject;
}) => {
  const { t } = useTranslation();

  return useMemo(() => {
    const result: Set<string> = new Set();
    protocol._portfolios.forEach((item) => {
      const data = item.withdrawActions;
      data?.forEach((action) => {
        if (
          action.need_approve?.to &&
          !isWhitelistSpender(action.need_approve?.to, protocol.chain!)
        ) {
          return;
        }
        try {
          const { abi } = buildActionCalldata(action.func, action.str_params);
          if (isBlacklistMethodName(abi.name)) {
            return;
          }
        } catch (error) {
          return;
        }
        if (
          action.type === ActionType.Withdraw ||
          action.type === ActionType.Queue
        ) {
          result.add(t('component.DappActions.withdraw'));
        } else if (action.type === ActionType.Claim) {
          result.add(t('component.DappActions.claim'));
        }
      });
    });
    return Array.from(result);
  }, [protocol]);
};
