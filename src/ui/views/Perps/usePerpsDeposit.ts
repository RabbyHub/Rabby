import { Account } from '@/background/service/preference';
import { isSameAddress, useWallet } from '@/ui/utils';
import abiCoderInst, { AbiCoder } from 'web3-eth-abi';
import { useCallback, useEffect, useState, useRef } from 'react';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useMemoizedFn } from 'ahooks';
import { findAccountByPriority } from '@/utils/account';
import { useInterval } from 'react-use';
import pRetry, { AbortError } from 'p-retry';
import {
  ARB_USDC_TOKEN_ID,
  ARB_USDC_TOKEN_ITEM,
  PERPS_AGENT_NAME,
  PERPS_SEND_ARB_USDC_ADDRESS,
} from './constants';
import { findChain } from '@/utils/chain';
import BigNumber from 'bignumber.js';
import { Tx } from 'background/service/openapi';
import { PerpBridgeQuote, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { last } from 'lodash';
const abiCoder = (abiCoderInst as unknown) as AbiCoder;

interface PerpBridgeHistory {
  from_chain_id: string;
  from_token_id: string;
  from_token_amount: number;
  to_token_amount: number;
  tx: Tx;
}

export const usePerpsDeposit = ({
  currentPerpsAccount,
  setAmountVisible,
}: {
  currentPerpsAccount: Account | null;
  setAmountVisible: (visible: boolean) => void;
}) => {
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const perpsState = useRabbySelector((state) => state.perps);
  const [miniSignTx, setMiniSignTx] = useState<Tx[] | null>(null);
  const [cacheUsdValue, setCacheUsdValue] = useState<number>(0);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(true);
  const [
    cacheBridgeHistory,
    setCacheBridgeHistory,
  ] = useState<PerpBridgeHistory | null>(null);
  const [bridgeQuote, setBridgeQuote] = useState<PerpBridgeQuote | null>(null);

  const resetBridgeQuote = useMemoizedFn(() => {
    setQuoteLoading(false);
    clearMiniSignTx();
    setCacheUsdValue(0);
    setBridgeQuote(null);
  });

  // 用于存储当前的AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateMiniSignTx = useMemoizedFn(
    async (usdValue: number, _token?: TokenItem) => {
      const token = _token || ARB_USDC_TOKEN_ITEM;
      if (token.id !== ARB_USDC_TOKEN_ID) {
        setQuoteLoading(true);
        const txs: Tx[] = [];
        try {
          // 取消之前的请求
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          // 创建新的AbortController
          const controller = new AbortController();
          abortControllerRef.current = controller;

          const amount = usdValue / token.price;
          console.log('updateMiniSignTx amount', amount, token);

          const fromTokenRawAmount = new BigNumber(amount)
            .times(10 ** token.decimals)
            .toFixed(0, 1)
            .toString();
          const res = await wallet.openapi.getPerpBridgeQuote({
            user_addr: currentPerpsAccount!.address,
            from_chain_id: token.chain,
            from_token_id: token.id,
            from_token_raw_amount: fromTokenRawAmount,
          });

          let tokenApproved = false;
          let allowance = '0';
          const fromChain = findChain({ serverId: token.chain });
          if (token.id === fromChain?.nativeTokenAddress) {
            tokenApproved = true;
          } else {
            allowance = await wallet.getERC20Allowance(
              token.chain,
              token.id,
              res.approve_contract_id
            );
            tokenApproved = new BigNumber(allowance).gte(
              new BigNumber(amount).times(10 ** token.decimals)
            );
          }
          if (controller.signal.aborted) {
            return;
          }
          if (res.tx) {
            if (!tokenApproved) {
              const resp = await wallet.approveToken(
                token.chain,
                token.id,
                res.approve_contract_id,
                fromTokenRawAmount,
                {
                  ga: {
                    category: 'Perps',
                    source: 'Perps',
                    trigger: 'Perps',
                  },
                },
                undefined,
                undefined,
                true
              );

              txs.push(resp.params[0]);
            }

            setBridgeQuote(res);
            setCacheUsdValue(res.to_token_amount * ARB_USDC_TOKEN_ITEM.price);
            txs.push(res.tx);
            setMiniSignTx(txs);
            setQuoteLoading(false);
            setCacheBridgeHistory({
              from_chain_id: token.chain,
              from_token_id: token.id,
              from_token_amount: amount,
              to_token_amount: res.to_token_amount,
              tx: res.tx,
            });
            return res.tx;
          } else {
            resetBridgeQuote();
          }
        } catch (error) {
          console.error('getPerpBridgeQuote error', error);
          resetBridgeQuote();
        }
      } else {
        resetBridgeQuote();
        const to = PERPS_SEND_ARB_USDC_ADDRESS;

        const chain = findChain({
          serverId: token.chain,
        })!;
        const sendValue = new BigNumber(usdValue || 0)
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

        setCacheUsdValue(usdValue);
        setMiniSignTx([params as Tx]);
        return params;
      }
    }
  );

  const clearMiniSignTx = useMemoizedFn(() => {
    setMiniSignTx(null);
  });

  const handleSignDepositDirect = useMemoizedFn(async (hash: string) => {
    if (!hash) {
      throw new Error('No hash tx');
    }

    const type = bridgeQuote?.tx ? 'receive' : 'deposit';

    dispatch.perps.setLocalLoadingHistory([
      {
        time: Date.now(),
        hash,
        type,
        status: 'pending',
        usdValue: cacheUsdValue.toString(),
      },
    ]);
    postPerpBridgeQuote(hash as string);
  });

  // Cleanup AbortController on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const postPerpBridgeQuote = useMemoizedFn(async (hash: string) => {
    if (!hash || !cacheBridgeHistory) {
      throw new Error('No hash tx');
    }

    const res = await wallet.openapi.postPerpBridgeHistory({
      from_chain_id: cacheBridgeHistory.from_chain_id,
      from_token_id: cacheBridgeHistory.from_token_id,
      from_token_amount: cacheBridgeHistory.from_token_amount,
      to_token_amount: cacheBridgeHistory.to_token_amount,
      tx_id: hash,
      tx: cacheBridgeHistory.tx,
    });

    setCacheBridgeHistory(null);
    console.log('postPerpBridgeQuote res', res);
  });

  const handleDeposit = useMemoizedFn(async () => {
    if (!miniSignTx) {
      throw new Error('No miniSignTx');
    }

    try {
      const res = await wallet.sendRequest({
        method: 'eth_sendTransaction',
        params: miniSignTx,
        $ctx: {
          ga: {
            category: 'Perps',
            source: 'Perps',
            trigger: 'Perps',
          },
        },
      });
      const signature = last(res as Array<string>);
      handleSignDepositDirect(signature as string);
      setAmountVisible(false);
      clearMiniSignTx();
      resetBridgeQuote();
    } catch (error) {
      setAmountVisible(false);
      clearMiniSignTx();
    }
  });

  useInterval(
    () => {
      dispatch.perps.fetchUserNonFundingLedgerUpdates();
    },
    perpsState.localLoadingHistory.length > 0 ? 30 * 1000 : null
  );

  return {
    miniSignTx,
    clearMiniSignTx,
    updateMiniSignTx,
    handleDeposit,
    quoteLoading,
    handleSignDepositDirect,
    bridgeQuote,
  };
};
