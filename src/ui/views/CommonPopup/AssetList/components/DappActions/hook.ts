import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { isSameAddress, useWallet } from '@/ui/utils';
import { Tx, WithdrawAction } from '@rabby-wallet/rabby-api/dist/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BLACKLIST_METHODS, WHITELIST_ADDRESS } from './constant';
import { AbiFunction, encodeFunctionData, parseAbiItem } from 'viem';
import { findChain } from '@/utils/chain';

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
      const data = '0x95d89b41';
      const ret = await wallet.requestETHRpc<string>(
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
    const addresses = data.params
      .map((item, index) => (isAddressArray[index] ? (item as string) : ''))
      .filter((item) => !!item);

    const validate = async (addr: string) => {
      if (isWhitelistAddress(addr)) return true;
      if (
        currentAccount?.address &&
        isSameAddress(currentAccount.address, addr)
      )
        return true;
      const isErc20 = await isErc20Contract(addr, chain);
      return isErc20;
    };

    const run = async () => {
      const results = await Promise.all(
        addresses.map((addr) => validate(addr))
      );
      const passed = results.every((item) => item);
      const isValidMethod = !isBlacklistMethod(data.func);
      console.log('CUSTOM_LOGGER:=>: valid addresses', {
        passed,
        isValidMethod,
      });
      setValid(passed && isValidMethod);
    };

    run();
  }, [chain, currentAccount?.address, data, isErc20Contract]);

  const action = useCallback(async (): Promise<Tx[]> => {
    console.log(
      'CUSTOM_LOGGER:=>: action',
      data,
      valid,
      currentAccount?.address,
      chainId
    );
    if (!data || !valid || !currentAccount?.address || !chainId) return [];

    const normalizedFunc = getMethodDesc(data.func);
    const abi = parseAbiItem(normalizedFunc) as AbiFunction;
    const params = data.params;
    console.log('CUSTOM_LOGGER:=>: params', params);
    const calldata = encodeFunctionData({
      abi: [abi],
      functionName: abi.name,
      args: params as any[],
    });
    console.log('CUSTOM_LOGGER:=>: calldata', calldata);

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
