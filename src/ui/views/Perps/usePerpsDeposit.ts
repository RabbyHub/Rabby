import { Account } from '@/background/service/preference';
import { isSameAddress, useWallet } from '@/ui/utils';
import abiCoderInst, { AbiCoder } from 'web3-eth-abi';
import { useCallback, useEffect, useState } from 'react';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useMemoizedFn } from 'ahooks';
import { findAccountByPriority } from '@/utils/account';
import { useInterval } from 'react-use';
import {
  ARB_USDC_TOKEN_ID,
  ARB_USDC_TOKEN_ITEM,
  PERPS_AGENT_NAME,
  PERPS_SEND_ARB_USDC_ADDRESS,
} from './constants';
import { getPerpsSDK, initPerpsSDK } from './sdkManager';
import { ClearinghouseState } from '@rabby-wallet/hyperliquid-sdk';
import { findChain } from '@/utils/chain';
import BigNumber from 'bignumber.js';
import { Tx } from 'background/service/openapi';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
const abiCoder = (abiCoderInst as unknown) as AbiCoder;

export const usePerpsDeposit = ({
  currentPerpsAccount,
}: {
  currentPerpsAccount: Account | null;
}) => {
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const perpsState = useRabbySelector((state) => state.perps);
  const [miniSignTx, setMiniSignTx] = useState<Tx | null>(null);
  const [cacheAmount, setCacheAmount] = useState<number>(0);
  const updateMiniSignTx = useMemoizedFn((amount: number) => {
    const token = ARB_USDC_TOKEN_ITEM;
    const to = PERPS_SEND_ARB_USDC_ADDRESS;

    const chain = findChain({
      serverId: token.chain,
    })!;
    const sendValue = new BigNumber(amount || 0)
      .multipliedBy(10 ** token.decimals)
      .decimalPlaces(0, BigNumber.ROUND_DOWN);
    const dataInput = [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          {
            type: 'address',
            name: 'to',
          },
          {
            type: 'uint256',
            name: 'value',
          },
        ] as any[],
      } as const,
      [to, sendValue.toFixed(0)] as any[],
    ] as const;
    const params: Record<string, any> = {
      chainId: chain.id,
      from: currentPerpsAccount!.address,
      to: token.id,
      value: '0x0',
      data: abiCoder.encodeFunctionCall(dataInput[0], dataInput[1]),
      isSend: true,
    };

    setCacheAmount(amount);
    setMiniSignTx(params as Tx);
    return params;
  });

  const clearMiniSignTx = useMemoizedFn(() => {
    setMiniSignTx(null);
  });

  const handleDeposit = useMemoizedFn(async () => {
    if (!miniSignTx) {
      throw new Error('No miniSignTx');
    }

    const tx = await wallet.sendRequest({
      method: 'eth_sendTransaction',
      params: [miniSignTx],
      $ctx: {
        ga: {
          category: 'Perps',
          source: 'Perps',
          trigger: 'Perps',
        },
      },
    });
    console.log('fallback res tx', tx);
  });

  useInterval(
    () => {
      dispatch.perps.fetchUserNonFundingLedgerUpdates(undefined);
    },
    perpsState.localLoadingHistory.length > 0 ? 5000 : null
  );

  const handleSignDepositDirect = useMemoizedFn(async (hash: string) => {
    if (!hash) {
      throw new Error('No hash tx');
    }

    dispatch.perps.setLocalLoadingHistory([
      {
        time: Date.now(),
        hash,
        type: 'deposit',
        status: 'pending',
        usdValue: cacheAmount.toString(),
      },
    ]);
  });

  return {
    miniSignTx,
    clearMiniSignTx,
    updateMiniSignTx,
    handleDeposit,
    handleSignDepositDirect,
  };
};
