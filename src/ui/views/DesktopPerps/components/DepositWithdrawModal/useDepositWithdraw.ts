import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { useWallet, isSameAddress } from '@/ui/utils';
import { useAsync, useDebounce } from 'react-use';
import BigNumber from 'bignumber.js';
import abiCoderInst, { AbiCoder } from 'web3-eth-abi';
import { last } from 'lodash';
import * as Sentry from '@sentry/browser';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import {
  ARB_USDC_TOKEN_ID,
  ARB_USDC_TOKEN_ITEM,
  ARB_USDC_TOKEN_SERVER_CHAIN,
  PERPS_SEND_ARB_USDC_ADDRESS,
} from '@/ui/views/Perps/constants';
import { PerpBridgeQuote, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { tokenAmountBn } from '@/ui/utils/token';
import {
  batchQueryTokens,
  queryTokensCache,
} from '@/ui/utils/portfolio/tokenUtils';
import { findChain, findChainByServerID } from '@/utils/chain';
import { CHAINS_ENUM, ETH_USDT_CONTRACT } from '@/constant';
import { Tx } from 'background/service/openapi';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { DepositWithdrawModalType } from './index';
import { typedDataSignatureStore } from '@/ui/component/MiniSignV2';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { Account } from '@/background/service/preference';

const abiCoder = (abiCoderInst as unknown) as AbiCoder;

interface PerpBridgeHistory {
  from_chain_id: string;
  from_token_id: string;
  from_token_amount: number;
  to_token_amount: number;
  tx: Tx;
}

export const useDepositWithdraw = (
  visible: boolean,
  type: DepositWithdrawModalType,
  onCancel: () => void
) => {
  const { getContainer } = usePopupContainer();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const clearinghouseState = useRabbySelector(
    (state) => state.perps.clearinghouseState
  );
  const currentPerpsAccount = useRabbySelector(
    (state) => state.perps.currentPerpsAccount
  );
  // State
  const [usdValue, setUsdValue] = useState<string>('');
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [tokenSelectVisible, setTokenSelectVisible] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenItem | null>(null);
  const [tokenList, setTokenList] = useState<TokenItem[]>([]);
  const [tokenListLoading, setTokenListLoading] = useState(false);
  const [gasPrice, setGasPrice] = useState<number>(0);
  const [isPreparingSign, setIsPreparingSign] = useState(false);

  // Deposit state
  const [miniSignTx, setMiniSignTx] = useState<Tx[] | null>(null);
  const [cacheUsdValue, setCacheUsdValue] = useState<number>(0);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [
    cacheBridgeHistory,
    setCacheBridgeHistory,
  ] = useState<PerpBridgeHistory | null>(null);
  const [bridgeQuote, setBridgeQuote] = useState<PerpBridgeQuote | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableBalance = clearinghouseState?.withdrawable || '0';

  // Fetch token info
  const { value: _tokenInfo } = useAsync(async () => {
    if (!currentPerpsAccount?.address || !visible || !selectedToken)
      return null;
    const info = await wallet.openapi.getToken(
      currentPerpsAccount.address,
      selectedToken?.chain,
      selectedToken?.id
    );
    return info;
  }, [
    currentPerpsAccount?.address,
    visible,
    selectedToken?.chain,
    selectedToken?.id,
  ]);

  // Check if user is missing role
  const { value: isMissingRole } = useAsync(async () => {
    if (Number(clearinghouseState?.marginSummary?.accountValue)) return false;
    if (!currentPerpsAccount?.address || !visible) return false;
    const sdk = getPerpsSDK();
    const { role } = await sdk.info.getUserRole(currentPerpsAccount.address);
    return role === 'missing';
  }, [currentPerpsAccount?.address, visible]);

  const tokenInfo = useMemo(() => {
    return _tokenInfo || selectedToken || ARB_USDC_TOKEN_ITEM;
  }, [_tokenInfo, selectedToken]);

  // Fetch token list
  const fetchTokenList = useCallback(async () => {
    setTokenListLoading(true);
    if (!currentPerpsAccount?.address || !visible || type === 'withdraw')
      return [];
    const res = await queryTokensCache(currentPerpsAccount.address, wallet);
    setTokenListLoading(false);
    setTokenList(res);
    const usdcToken = res.find(
      (t) =>
        t.id === ARB_USDC_TOKEN_ID && t.chain === ARB_USDC_TOKEN_SERVER_CHAIN
    );
    usdcToken && setSelectedToken(usdcToken);

    const tokenRes = await batchQueryTokens(
      currentPerpsAccount.address,
      wallet,
      undefined,
      false,
      false
    );
    setTokenList(tokenRes);
    return res;
  }, [currentPerpsAccount?.address, visible, wallet, type]);

  useEffect(() => {
    if (visible) {
      fetchTokenList();
    }
  }, [fetchTokenList, visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setUsdValue('');
      setSelectedToken(null);
      setIsWithdrawLoading(false);
      setGasPrice(0);
      setTokenSelectVisible(false);
      setMiniSignTx(null);
      setCacheUsdValue(0);
      setQuoteLoading(false);
      setBridgeQuote(null);
      setCacheBridgeHistory(null);
      setIsPreparingSign(false);
    }
  }, [visible]);

  // Focus input when modal opens and token selector closes
  useEffect(() => {
    if (visible && inputRef.current && !tokenSelectVisible && selectedToken) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [visible, tokenSelectVisible, selectedToken]);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const isDirectDeposit = useMemo(() => {
    return (
      selectedToken?.id === ARB_USDC_TOKEN_ID &&
      selectedToken?.chain === ARB_USDC_TOKEN_SERVER_CHAIN
    );
  }, [selectedToken]);

  const depositMaxUsdValue = useMemo(() => {
    return isDirectDeposit
      ? tokenAmountBn(tokenInfo).toNumber()
      : new BigNumber(tokenInfo?.amount || 0)
          .times(new BigNumber(tokenInfo?.price || 0))
          .toNumber();
  }, [tokenInfo, isDirectDeposit]);

  const chainInfo = useMemo(() => {
    return (
      findChainByServerID(
        selectedToken?.chain || ARB_USDC_TOKEN_SERVER_CHAIN
      ) || null
    );
  }, [selectedToken?.chain]);

  const tokenIsNativeToken = useMemo(() => {
    if (selectedToken && selectedToken.chain) {
      return isSameAddress(
        selectedToken.id,
        chainInfo?.nativeTokenAddress || ''
      );
    }
    return false;
  }, [selectedToken, chainInfo?.nativeTokenAddress]);

  const nativeTokenDecimals = useMemo(
    () => chainInfo?.nativeTokenDecimals || 1e18,
    [chainInfo?.nativeTokenDecimals]
  );

  const gasLimit = useMemo(
    () => (chainInfo?.enum === CHAINS_ENUM.ETH ? 1000000 : 2000000),
    [chainInfo?.enum]
  );

  // Gas list
  const { value: gasList } = useAsync(async () => {
    if (!selectedToken?.chain) return [];
    return wallet.gasMarketV2({ chainId: selectedToken.chain });
  }, [selectedToken?.chain]);

  const canUseDirectSubmitTx = useMemo(
    () => supportedDirectSign(currentPerpsAccount?.type || ''),
    [currentPerpsAccount?.type]
  );

  // Reset bridge quote
  const resetBridgeQuote = useMemoizedFn(() => {
    setQuoteLoading(false);
    setMiniSignTx(null);
    setCacheUsdValue(0);
    setBridgeQuote(null);
  });

  const resetFormValue = useMemoizedFn(() => {
    resetBridgeQuote();
    setUsdValue('');
    setCacheUsdValue(0);
  });

  // Update mini sign tx for deposit
  const updateMiniSignTx = useMemoizedFn(async () => {
    if (!visible || type === 'withdraw' || !selectedToken) return;
    const value = Number(usdValue) || 0;
    if (value < 5 || value > depositMaxUsdValue) return;

    const token = tokenInfo || ARB_USDC_TOKEN_ITEM;

    if (token.id !== ARB_USDC_TOKEN_ID) {
      setQuoteLoading(true);
      const txs: Tx[] = [];
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const amount = value / token.price;

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
        let shouldTwoStepApprove = false;
        if (
          fromChain?.enum === CHAINS_ENUM.ETH &&
          isSameAddress(token.id, ETH_USDT_CONTRACT) &&
          Number(allowance) !== 0 &&
          !tokenApproved
        ) {
          shouldTwoStepApprove = true;
        }

        if (controller.signal.aborted) {
          return;
        }
        if (res.tx && currentPerpsAccount) {
          if (!tokenApproved) {
            if (shouldTwoStepApprove) {
              const resp = await wallet.approveToken(
                token.chain,
                token.id,
                res.approve_contract_id,
                0,
                {
                  ga: {
                    category: 'Perps',
                    source: 'Perps',
                    trigger: 'Perps',
                  },
                },
                undefined,
                undefined,
                true,
                currentPerpsAccount
              );
              txs.push(resp.params[0]);
            }

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
              true,
              currentPerpsAccount
            );

            txs.push(resp.params[0]);
          }

          setBridgeQuote(res);
          setCacheUsdValue(
            isMissingRole
              ? res.to_token_amount * ARB_USDC_TOKEN_ITEM.price - 1
              : res.to_token_amount * ARB_USDC_TOKEN_ITEM.price
          );
          const bridgeTx = {
            from: res.tx.from,
            to: res.tx.to,
            value: res.tx.value,
            data: res.tx.data,
            chainId: res.tx.chainId,
            gasPrice: gasPrice || undefined,
          } as Tx;
          txs.push(bridgeTx);
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
      const sendValue = new BigNumber(value || 0)
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

      setCacheUsdValue(value);
      setMiniSignTx([params as Tx]);
      return params;
    }
  });

  // Debounce update mini sign tx
  useDebounce(updateMiniSignTx, 300, [
    gasPrice,
    usdValue,
    visible,
    type,
    tokenInfo,
    isMissingRole,
    selectedToken,
  ]);

  const postPerpBridgeQuote = useMemoizedFn(async (hash: string) => {
    if (!hash || !cacheBridgeHistory) {
      return;
    }

    try {
      await wallet.openapi.postPerpBridgeHistory({
        from_chain_id: cacheBridgeHistory.from_chain_id,
        from_token_id: cacheBridgeHistory.from_token_id,
        from_token_amount: cacheBridgeHistory.from_token_amount,
        to_token_amount: cacheBridgeHistory.to_token_amount,
        tx_id: hash,
        tx: cacheBridgeHistory.tx,
      });
      setCacheBridgeHistory(null);
    } catch (error) {
      console.error('postPerpBridgeQuote error', error);
    }
  });

  const handleSignDepositDone = useMemoizedFn(async (hash: string) => {
    if (!hash) return;

    const depositType = bridgeQuote?.tx ? 'receive' : 'deposit';

    dispatch.perps.setLocalLoadingHistory([
      {
        time: Date.now(),
        hash,
        type: depositType,
        status: 'pending',
        usdValue: cacheUsdValue.toString(),
      },
    ]);
    postPerpBridgeQuote(hash);
  });

  const { openDirect, close: closeSign } = useMiniSigner({
    account: currentPerpsAccount!,
  });

  // Handle deposit
  const handleDepositClick = useMemoizedFn(async () => {
    if (!miniSignTx || !currentPerpsAccount) {
      console.error('handleDepositClick No miniSignTx');
      return;
    }

    if (canUseDirectSubmitTx) {
      setIsPreparingSign(true);
      closeSign();
      try {
        await dispatch.account.changeAccountAsync(currentPerpsAccount);

        const hashes = await openDirect({
          txs: miniSignTx,
          checkGasFeeTooHigh: true,
          getContainer: '.desktop-perps-deposit-withdraw-content',
          ga: {
            category: 'Perps',
            source: 'Perps',
            trigger: 'Perps',
          },
          onPreExecError: () => {
            handleDepositFullSign();
          },
        });
        if (hashes && hashes.length > 0) {
          handleSignDepositDone(hashes[hashes.length - 1]);
          resetFormValue();
          onCancel();
        }
      } catch (error) {
        if (error === MINI_SIGN_ERROR.USER_CANCELLED) {
          return;
        }
        // Fallback to full sign txs
        handleDepositFullSign();
      } finally {
        setIsPreparingSign(false);
      }
    } else {
      await handleDepositFullSign();
    }
  });

  const handleDepositFullSign = useMemoizedFn(async () => {
    if (!miniSignTx) {
      console.error('handleDepositFullSign No miniSignTx');
      return;
    }

    try {
      const promise = Promise.all(
        miniSignTx.map((tx) => {
          return wallet.sendRequest({
            method: 'eth_sendTransaction',
            params: [tx],
            $ctx: {
              ga: {
                category: 'Perps',
                source: 'Perps',
                trigger: 'Perps',
              },
            },
          });
        })
      );

      const res = await promise;
      const signature = last(res as Array<string>);
      handleSignDepositDone(signature as string);
      resetFormValue();
      onCancel();
    } catch (error) {
      // setMiniSignTx(null);
    }
  });

  const executeSignTypedData = useMemoizedFn(
    async (actions: any[], account: Account) => {
      if (!actions || actions.length === 0) {
        throw new Error('no signature, try later');
      }
      let result: string[] = [];
      await dispatch.account.changeAccountAsync(account);
      if (canUseDirectSubmitTx) {
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
              getContainer: '.desktop-perps-deposit-withdraw-content',
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

  // Handle withdraw
  const handleWithdrawClick = useMemoizedFn(async () => {
    const amount = Number(usdValue) || 0;
    if (amount < 2) return;

    setIsWithdrawLoading(true);
    try {
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

      const [signature] = await executeSignTypedData(
        [action],
        currentPerpsAccount
      );

      const res = await sdk.exchange.sendWithdraw({
        action: action.message as any,
        nonce: action.nonce || 0,
        signature: signature as string,
      });

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
      resetFormValue();
      onCancel();
    } catch (error: any) {
      console.error('Failed to withdraw:', error);
      message.error({
        duration: 1.5,
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
            JSON.stringify({ error })
        )
      );
    } finally {
      setIsWithdrawLoading(false);
    }
  });

  // Handle percentage click
  const handlePercentageClick = useCallback(
    (percentage: number) => {
      if (type === 'withdraw') {
        const value = new BigNumber(availableBalance)
          .times(percentage)
          .decimalPlaces(2, BigNumber.ROUND_DOWN)
          .toFixed();
        setUsdValue(value);
      } else {
        if (percentage === 1) {
          // Max logic
          if (tokenIsNativeToken && gasList) {
            const checkGasIsEnough = (price: number) => {
              return new BigNumber(tokenInfo?.raw_amount_hex_str || 0, 16).gte(
                new BigNumber(gasLimit).times(price)
              );
            };
            const normalPrice =
              gasList?.find((e) => e.level === 'normal')?.price || 0;
            const isNormalEnough = checkGasIsEnough(normalPrice);
            if (isNormalEnough) {
              const val = tokenAmountBn(tokenInfo).minus(
                new BigNumber(gasLimit)
                  .times(normalPrice)
                  .div(10 ** nativeTokenDecimals)
              );
              setUsdValue(
                val
                  .times(tokenInfo?.price || 0)
                  .decimalPlaces(2, BigNumber.ROUND_DOWN)
                  .toFixed()
              );
              setGasPrice(normalPrice);
              return;
            }
          }
          setGasPrice(0);
          if (isDirectDeposit) {
            setUsdValue(tokenAmountBn(tokenInfo).toString());
          } else {
            setUsdValue(
              tokenAmountBn(tokenInfo)
                ?.times(tokenInfo?.price || 0)
                .decimalPlaces(2, BigNumber.ROUND_DOWN)
                .toFixed()
            );
          }
        } else {
          const value = new BigNumber(depositMaxUsdValue)
            .times(percentage)
            .decimalPlaces(2, BigNumber.ROUND_DOWN)
            .toFixed();
          setUsdValue(value);
        }
      }
    },
    [
      type,
      availableBalance,
      depositMaxUsdValue,
      tokenIsNativeToken,
      gasList,
      tokenInfo,
      gasLimit,
      nativeTokenDecimals,
      isDirectDeposit,
    ]
  );

  // Handle token select
  const handleTokenSelect = useCallback((token: TokenItem) => {
    setSelectedToken(token);
    setTokenSelectVisible(false);
    setUsdValue('');
  }, []);

  const handleCloseTokenSelect = useCallback(() => {
    setTokenSelectVisible(false);
  }, []);

  const handleUsdValueChange = useCallback((value: string) => {
    setUsdValue(value);
  }, []);

  const estReceiveUsdValue = useMemo(() => {
    if (isDirectDeposit) {
      return new BigNumber(usdValue).toNumber();
    }

    const value =
      (bridgeQuote?.to_token_amount || 0) * ARB_USDC_TOKEN_ITEM.price;
    return isMissingRole ? value - 1 : value;
  }, [bridgeQuote, isMissingRole, isDirectDeposit, usdValue]);

  return {
    // State
    usdValue,
    setUsdValue: handleUsdValueChange,
    selectedToken,
    tokenList,
    tokenListLoading,
    tokenSelectVisible,
    setTokenSelectVisible,
    isPreparingSign,
    isWithdrawLoading,
    quoteLoading,
    bridgeQuote,
    inputRef,

    // Computed
    availableBalance,
    depositMaxUsdValue,
    isDirectDeposit,
    estReceiveUsdValue,
    tokenInfo,

    // Actions
    handlePercentageClick,
    handleTokenSelect,
    handleCloseTokenSelect,
    handleDepositClick,
    handleWithdrawClick,
  };
};
