import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { isSameAddress, useWallet } from '@/ui/utils';
import { Tx, WithdrawAction } from '@rabby-wallet/rabby-api/dist/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  return useCallback(
    async (address: string, serverId?: string) => {
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
    },
    [wallet]
  );
};

export const getMethodDesc = (fncName: string) => {
  if (fncName.trim().startsWith('function ')) {
    return fncName;
  }
  const normalizedName = fncName.trim();
  // 移除最后一个括号及其内容
  return `function ${normalizedName.split(')(')[0] + ')'}`;
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

export const buildDappActionTx = ({
  data,
  chainId,
  chainServerId,
  from,
  protocolName,
}: {
  data: WithdrawAction;
  chainId: number;
  chainServerId: string;
  from: string;
  protocolName?: string;
}): Tx | null => {
  let calldata: `0x${string}`;
  let methodName = '';
  let expectedParamCount: number | undefined;
  try {
    const built = buildActionCalldata(data.func, data.str_params);
    expectedParamCount = built.abi.inputs.length;
    methodName = built.abi.name;
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
          chain_id: String(chainId),
          chain_server_id: chainServerId,
          action_type: data.type,
          original_error_name: errorName,
        },
        fingerprint: ['dapp-action', 'encode-params', errorName],
        extra: {
          function_signature: data.func,
          expected_param_count: expectedParamCount,
          actual_param_count: data.str_params?.length || 0,
        },
      }
    );
    return null;
  }

  if (isBlacklistMethodName(methodName)) {
    return null;
  }

  return {
    chainId,
    from,
    to: data.contract_id,
    value: '0x0',
    data: calldata,
  } as any;
};

export const useValidateDappAction = () => {
  const currentAccount = useCurrentAccount();
  const isErc20Contract = useIsContractBySymbol();

  return useCallback(
    async (data: WithdrawAction, chain: string) => {
      try {
        const { abi } = buildActionCalldata(data.func, data.str_params);
        const isAddressArray = abi.inputs.map(
          (item) => item.type === 'address'
        );
        const addresses = data.str_params
          ? data.str_params
              ?.map((item, index) =>
                isAddressArray[index] ? (item as string) : ''
              )
              ?.filter((item) => !!item)
          : [];

        const validate = async (addr: string) => {
          if (
            currentAccount?.address &&
            isSameAddress(currentAccount.address, addr)
          )
            return true;
          if (isWhitelistAddress(addr)) return true;
          const isErc20 = await isErc20Contract(addr, chain);
          return isErc20;
        };

        if (
          data?.need_approve?.to &&
          !isWhitelistSpender(data.need_approve?.to, chain)
        ) {
          return false;
        }
        if (isBlacklistMethodName(abi.name)) {
          return false;
        }
        if (!addresses?.length) {
          return true;
        }
        const results = await Promise.all(
          addresses.map((addr) => validate(addr))
        );
        return results.every((item) => item);
      } catch (error) {
        // ignore error and hide actions
        return false;
      }
    },
    [currentAccount?.address, isErc20Contract]
  );
};

export const useDappAction = (
  data: WithdrawAction | undefined,
  chain?: string,
  protocolName?: string
) => {
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();
  const [valid, setValid] = useState(false);
  const validateDappAction = useValidateDappAction();

  const chainInfo = useMemo(() => {
    return findChain({
      serverId: chain,
    });
  }, [chain]);

  useEffect(() => {
    if (!data || !chain) {
      setValid(false);
      return;
    }

    let isMounted = true;

    validateDappAction(data, chain).then((passed) => {
      if (isMounted) {
        setValid(passed);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [chain, data, validateDappAction]);

  const buildApproveTxs = useCallback(async (): Promise<Tx[]> => {
    const resTxs: Tx[] = [];
    if (
      !data ||
      !valid ||
      !currentAccount?.address ||
      !chainInfo?.id ||
      !data?.need_approve?.to ||
      !data?.need_approve?.token_id ||
      !data?.need_approve?.str_raw_amount
    ) {
      return [];
    }

    let tokenApproved = false;
    let allowance = '0';
    if (data?.need_approve.to === chainInfo?.nativeTokenAddress) {
      tokenApproved = true;
    } else {
      try {
        allowance = await wallet.getERC20Allowance(
          chainInfo.serverId,
          data?.need_approve?.token_id,
          data?.need_approve?.to
        );
        tokenApproved = new BigNumber(allowance).gte(
          new BigNumber(data.need_approve.str_raw_amount || '0')
        );
      } catch (error) {
        // ignore error, default to not approved
      }
    }
    let shouldTwoStepApprove = false;
    if (
      chainInfo?.enum === CHAINS_ENUM.ETH &&
      isSameAddress(data?.need_approve?.to, ETH_USDT_CONTRACT) &&
      Number(allowance) !== 0 &&
      !tokenApproved
    ) {
      shouldTwoStepApprove = true;
    }
    if (shouldTwoStepApprove) {
      const res = await wallet.approveToken(
        chainInfo.serverId,
        data?.need_approve?.token_id,
        data?.need_approve?.to,
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
        data?.need_approve?.token_id,
        data?.need_approve?.to,
        data?.need_approve?.str_raw_amount || '0',
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
  }, [
    data,
    valid,
    currentAccount?.address,
    chainInfo?.id,
    chainInfo?.nativeTokenAddress,
    chainInfo?.enum,
    chainInfo?.serverId,
    wallet,
  ]);

  const action = useCallback(async (): Promise<Tx[]> => {
    if (!data || !valid || !currentAccount?.address || !chainInfo?.id) {
      return [];
    }

    const tx = buildDappActionTx({
      data,
      chainId: chainInfo.id,
      chainServerId: chainInfo.serverId,
      from: currentAccount.address,
      protocolName,
    });
    if (!tx) {
      return [];
    }

    const approve_txs = await buildApproveTxs();

    return [...approve_txs, tx];
  }, [
    data,
    valid,
    currentAccount?.address,
    chainInfo?.id,
    chainInfo?.serverId,
    buildApproveTxs,
    protocolName,
  ]);

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
