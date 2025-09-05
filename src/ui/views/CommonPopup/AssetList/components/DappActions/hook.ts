import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { isSameAddress, useWallet } from '@/ui/utils';
import { Tx, WithdrawAction } from '@rabby-wallet/rabby-api/dist/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BLACKLIST_METHODS, WHITELIST_ADDRESS } from './constant';
import { AbiFunction, encodeFunctionData, parseAbiItem } from 'viem';
import { findChain } from '@/utils/chain';
import { isValidAddress } from '@ethereumjs/util';
import PQueue from 'p-queue';

const rpcQueue = new PQueue({
  concurrency: 5,
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

export const useIsContractBySymbol = () => {
  const wallet = useWallet();
  return async (address: string, serverId?: string) => {
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

      return !!ret && ret !== '0x' && ret !== '0x0';
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
  const [valid, setValid] = useState(false);
  const isErc20Contract = useIsContractBySymbol();

  const chainId = useMemo(() => {
    return findChain({
      serverId: chain,
    })?.id;
  }, [chain]);

  useEffect(() => {
    if (!data) return;
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
      const isValidMethod = !isBlacklistMethod(data.func);
      if (!isValidMethod) {
        setValid(false);
        return;
      }
      if (!addresses?.length) {
        setValid(true);
        return;
      }
      const results = await Promise.all(
        addresses.map((addr) => validate(addr))
      );
      const passed = results.every((item) => item);
      setValid(passed);
    };

    run();
  }, [chain, currentAccount?.address, data, isErc20Contract]);

  const action = useCallback(async (): Promise<Tx[]> => {
    if (!data || !valid || !currentAccount?.address || !chainId) return [];

    const normalizedFunc = getMethodDesc(data.func);
    const abi = parseAbiItem(normalizedFunc) as AbiFunction;
    const params = data.str_params;
    const calldata = encodeFunctionData({
      abi: [abi],
      functionName: abi.name,
      args: params as any[],
    });

    const tx = {
      chainId: chainId,
      from: currentAccount.address,
      to: data.contract_id,
      value: '0x0',
      data: calldata,
    } as any;
    return [tx];
  }, [data, valid, currentAccount?.address, chainId]);

  return {
    valid,
    action,
  };
};
