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

const rpcQueue = new PQueue({
  concurrency: 20,
  interval: 1000,
  intervalCap: 10,
});

export const isBlacklistMethod = (method: string) => {
  return BLACKLIST_METHODS.map((item) => item.toLowerCase()).includes(
    method.toLowerCase()
  );
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
  let normalizedName = fncName.trim();
  // 移除最后一个括号及其内容
  const lastParenIndex = normalizedName.lastIndexOf('(');
  if (lastParenIndex !== -1) {
    normalizedName = normalizedName.substring(0, lastParenIndex);
  }
  return `function ${normalizedName}`;
};

export const useDappAction = (
  data: WithdrawAction | undefined,
  chain?: string
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

  useEffect(() => {
    if (!data || !chain) return;

    let isMounted = true;

    try {
      const normalizedFunc = getMethodDesc(data.func);
      const abi = parseAbiItem(normalizedFunc) as AbiFunction;
      const isAddressArray = abi.inputs.map((item) => item.type === 'address');
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

      const run = async () => {
        if (
          data?.need_approve?.to &&
          !isWhitelistSpender(data.need_approve?.to, chain)
        ) {
          if (isMounted) {
            setValid(false);
          }
          return;
        }
        const isValidMethod = !isBlacklistMethod(data.func);
        if (!isValidMethod) {
          if (isMounted) {
            setValid(false);
          }
          return;
        }
        if (!addresses?.length) {
          if (isMounted) {
            setValid(true);
          }
          return;
        }
        const results = await Promise.all(
          addresses.map((addr) => validate(addr))
        );
        const passed = results.every((item) => item);
        if (isMounted) {
          setValid(passed);
        }
      };

      run();
    } catch (error) {
      // ignore error and hide actions
      if (isMounted) {
        setValid(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [chain, currentAccount?.address, data, isErc20Contract]);

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

    const normalizedFunc = getMethodDesc(data.func);
    const abi = parseAbiItem(normalizedFunc) as AbiFunction;
    const params = data.str_params;
    const calldata = encodeFunctionData({
      abi: [abi],
      functionName: abi.name,
      args: params as any[],
    });

    const approve_txs = await buildApproveTxs();

    const tx = {
      chainId: chainInfo.id,
      from: currentAccount.address,
      to: data.contract_id,
      value: '0x0',
      data: calldata,
    } as any;

    return [...approve_txs, tx];
  }, [data, valid, currentAccount?.address, chainInfo?.id, buildApproveTxs]);

  return {
    valid,
    action,
  };
};
