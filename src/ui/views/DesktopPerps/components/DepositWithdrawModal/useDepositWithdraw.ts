import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { useWallet, isSameAddress } from '@/ui/utils';
import { useAsync, useDebounce } from 'react-use';
import { toChecksumAddress } from '@ethereumjs/util';
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
  HYPE_USDC_TOKEN_ID,
  HYPE_USDC_TOKEN_SERVER_CHAIN,
  HYPE_CORE_DEPOSIT_WALLET,
  HYPE_CORE_DEPOSIT_PERPS_DEX,
  HYPE_USDC_TOKEN_ITEM,
  HYPE_EVM_BRIDGE_ADDRESS,
  HYPE_SEND_ASSET_TOKEN,
  isHypeWithdrawToken,
  HYPE_EVM_BRIDGE_ADDRESS_MAP,
  HYPE_SEND_ASSET_TOKEN_MAP,
  WITHDRAW_CHAIN_TOKENS,
  PerpsQuoteAsset,
  getSpotBalanceKey,
} from '@/ui/views/Perps/constants';
import { getTokenSymbol } from '@/ui/utils/token';
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
import { sortTokenList } from '../../utils';
import { usePerpsAccount } from '@/ui/views/Perps/hooks/usePerpsAccount';
import { useTwoStepSwap } from '@/ui/views/Swap/hooks/twoStepSwap';

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
  // Withdraw: which chain is the user withdrawing to (arb | hyper)
  const [selectChainId, setSelectChainId] = useState<string>(
    ARB_USDC_TOKEN_SERVER_CHAIN
  );
  const [chainSelectVisible, setChainSelectVisible] = useState(false);

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

  const {
    availableBalance,
    isUnifiedAccount,
    spotBalancesMap,
  } = usePerpsAccount();

  // Fetch preTransferCheck fee for HyperEVM withdrawal — per-bridge (USDC/USDT/USDE/USDH).
  const [hypeTransferFee, setHypeTransferFee] = useState<string>('0');
  useEffect(() => {
    if (!visible || !currentPerpsAccount?.address) {
      setHypeTransferFee('0');
      return;
    }
    // selectedToken's symbol decides which bridge to query; fallback USDC when not picked yet.
    const sym = selectedToken
      ? (getTokenSymbol(selectedToken).toUpperCase() as PerpsQuoteAsset)
      : 'USDC';
    const bridge =
      HYPE_EVM_BRIDGE_ADDRESS_MAP[
        sym === 'USDC' || sym === 'USDT' || sym === 'USDE' || sym === 'USDH'
          ? sym
          : 'USDC'
      ];
    const sdk = getPerpsSDK();
    sdk.info
      .getPreTransferCheck(bridge, currentPerpsAccount.address)
      .then((res) => {
        setHypeTransferFee(res?.fee || '0');
      })
      .catch(() => {
        setHypeTransferFee('0');
      });
  }, [visible, currentPerpsAccount?.address, selectedToken]);

  const marketDataMap = useRabbySelector((state) => state.perps.marketDataMap);

  // Gas fee for every HyperEVM withdrawal: fixed 0.00002 HYPE
  const hypeGasFeeUsd = useMemo(() => {
    const hypePrice = Number(marketDataMap?.['HYPE']?.markPx || 0);
    return new BigNumber(0.00002).times(hypePrice).toNumber();
  }, [marketDataMap]);

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

  const tokenInfo = useMemo(() => {
    return _tokenInfo || selectedToken || ARB_USDC_TOKEN_ITEM;
  }, [_tokenInfo, selectedToken]);

  const supportedChains = useRabbySelector((s) => s.bridge.supportedChains);

  const pickDefaultToken = useCallback((list: TokenItem[]) => {
    if (!list.length) return;
    // Pick the first token with balance (list is already sorted by USD value)
    const withBalance = list.find((t) => t.amount > 0);
    setSelectedToken(withBalance ?? ARB_USDC_TOKEN_ITEM);
  }, []);

  // Fetch token list
  const fetchTokenList = useCallback(async () => {
    if (!currentPerpsAccount?.address || !visible) return;
    setTokenListLoading(true);
    if (type === 'withdraw') {
      setTokenListLoading(false);
      if (!selectedToken) {
        setSelectedToken(ARB_USDC_TOKEN_ITEM);
      }
      return;
    }
    const res = await queryTokensCache(currentPerpsAccount.address, wallet);
    const sortedTokenList = sortTokenList(res, supportedChains);
    setTokenListLoading(false);
    setTokenList(sortedTokenList);
    pickDefaultToken(sortedTokenList);

    const tokenRes = await batchQueryTokens(
      currentPerpsAccount.address,
      wallet,
      undefined,
      false,
      false
    );
    const fullSortedList = sortTokenList(tokenRes, supportedChains);
    setTokenList(fullSortedList);
    pickDefaultToken(fullSortedList);
    return;
  }, [
    currentPerpsAccount?.address,
    visible,
    wallet,
    type,
    supportedChains,
    pickDefaultToken,
  ]);

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

  const isHypeDeposit = useMemo(() => {
    return (
      selectedToken?.id === HYPE_USDC_TOKEN_ID &&
      selectedToken?.chain === HYPE_USDC_TOKEN_SERVER_CHAIN
    );
  }, [selectedToken]);

  const isDirectDeposit = useMemo(() => {
    return (
      (selectedToken?.id === ARB_USDC_TOKEN_ID &&
        selectedToken?.chain === ARB_USDC_TOKEN_SERVER_CHAIN) ||
      isHypeDeposit
    );
  }, [selectedToken, isHypeDeposit]);

  const isHypeWithdraw = useMemo(() => {
    return type === 'withdraw' && selectChainId !== ARB_USDC_TOKEN_SERVER_CHAIN;
  }, [type, selectChainId]);

  // Symbol of the token currently selected for withdrawal (USDC / USDT / USDH / USDE)
  const withdrawTargetAsset = useMemo<PerpsQuoteAsset>(() => {
    if (type !== 'withdraw' || !selectedToken) return 'USDC';
    const sym = getTokenSymbol(selectedToken).toUpperCase() as PerpsQuoteAsset;
    if (sym === 'USDC' || sym === 'USDT' || sym === 'USDH' || sym === 'USDE') {
      return sym;
    }
    return 'USDC';
  }, [type, selectedToken]);

  // Tokens available for the currently selected withdraw chain, with balance
  const chainTokenItems = useMemo(() => {
    const list = WITHDRAW_CHAIN_TOKENS[selectChainId] || [];
    return list
      .map((token) => {
        const sym = getTokenSymbol(token).toUpperCase() as PerpsQuoteAsset;
        let balance = 0;
        if (isUnifiedAccount) {
          const b = spotBalancesMap[getSpotBalanceKey(sym)]?.available;
          balance = b ? Number(b) : 0;
        } else if (sym === 'USDC') {
          balance = availableBalance;
        }
        return { token, balance };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [selectChainId, isUnifiedAccount, spotBalancesMap, availableBalance]);

  const withdrawMaxBalance = useMemo(() => {
    // Pick the selected-token's balance from chainTokenItems when withdrawing to HyperEVM.
    // `availableBalance` (cross-sum) is only correct when all stablecoins are effectively
    // interchangeable at the sending side — i.e., USDC withdraw to Arbitrum.
    const baseBalance = (() => {
      if (type !== 'withdraw') return availableBalance;
      if (!isHypeWithdraw) return availableBalance;
      if (!selectedToken) return availableBalance;
      const row = chainTokenItems.find(
        (i) =>
          i.token.id === selectedToken.id &&
          i.token.chain === selectedToken.chain
      );
      return row ? row.balance : 0;
    })();
    if (!isHypeWithdraw) return baseBalance;
    if (!Number(hypeTransferFee)) return baseBalance;
    return Math.max(
      0,
      new BigNumber(baseBalance)
        .minus(hypeTransferFee)
        .decimalPlaces(6, BigNumber.ROUND_DOWN)
        .toNumber()
    );
  }, [
    type,
    isHypeWithdraw,
    availableBalance,
    hypeTransferFee,
    selectedToken,
    chainTokenItems,
  ]);

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

  // Build HYPE deposit transactions (approve + deposit)
  const buildHypeDepositTxs = useMemoizedFn(
    async (amount: number, token: TokenItem) => {
      if (!currentPerpsAccount) return [];

      const chain = findChain({
        serverId: HYPE_USDC_TOKEN_SERVER_CHAIN,
      })!;
      const rawAmount = new BigNumber(amount)
        .multipliedBy(10 ** token.decimals)
        .toFixed(0, 1)
        .toString();

      const targetTxs: Tx[] = [];

      const allowance = await wallet.getERC20Allowance(
        HYPE_USDC_TOKEN_SERVER_CHAIN,
        HYPE_USDC_TOKEN_ID,
        HYPE_CORE_DEPOSIT_WALLET
      );

      const tokenApproved = new BigNumber(allowance).gte(
        new BigNumber(rawAmount)
      );

      if (!tokenApproved) {
        const resp = await wallet.approveToken(
          HYPE_USDC_TOKEN_SERVER_CHAIN,
          HYPE_USDC_TOKEN_ID,
          HYPE_CORE_DEPOSIT_WALLET,
          rawAmount,
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
        targetTxs.push(resp.params[0]);
      }

      const depositData = abiCoder.encodeFunctionCall(
        {
          name: 'deposit',
          type: 'function',
          inputs: [
            { type: 'uint256', name: 'amount' },
            { type: 'uint32', name: 'destinationDex' },
          ] as any[],
        },
        [rawAmount, String(HYPE_CORE_DEPOSIT_PERPS_DEX)] as any[]
      );

      targetTxs.push({
        chainId: chain.id,
        from: currentPerpsAccount.address,
        to: HYPE_CORE_DEPOSIT_WALLET,
        value: '0x0',
        data: depositData,
      } as Tx);

      return targetTxs;
    }
  );

  // Update mini sign tx for deposit
  const updateMiniSignTx = useMemoizedFn(async () => {
    if (!visible || type === 'withdraw' || !selectedToken) return;
    const value = Number(usdValue) || 0;
    if (value < 5 || value > depositMaxUsdValue) return;

    const token = tokenInfo || ARB_USDC_TOKEN_ITEM;

    if (isHypeDeposit) {
      setQuoteLoading(true);
      try {
        const hypeTxs = await buildHypeDepositTxs(value, token);
        setMiniSignTx(hypeTxs);
        setBridgeQuote(null);
        setCacheUsdValue(value);
        setQuoteLoading(false);
      } catch (error) {
        console.error('buildHypeDepositTxs error', error);
        resetBridgeQuote();
      }
    } else if (token.id !== ARB_USDC_TOKEN_ID) {
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
          setCacheUsdValue(res.to_token_amount * ARB_USDC_TOKEN_ITEM.price);
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
        [toChecksumAddress(to), sendValue.toFixed(0)] as any[],
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
    selectedToken,
    isHypeDeposit,
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

    const depositType =
      bridgeQuote?.tx || isHypeDeposit ? 'receive' : 'deposit';

    dispatch.perps.setLocalLoadingHistory([
      {
        // Set a slightly earlier time to ensure it appears before withdraw in history
        time: Date.now() - 1000,
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

  const {
    shouldTwoStep,
    currentTxs: twoStepCurrentTxs,
    next: twoStepNext,
    isApprove: twoStepIsApprove,
    approvePending: twoStepApprovePending,
  } = useTwoStepSwap({
    chain: chainInfo?.enum || ('' as CHAINS_ENUM),
    txs: miniSignTx || undefined,
    enable: !!canUseDirectSubmitTx && isHypeDeposit,
    type: 'approveBridge',
  });

  // Handle deposit
  const handleDepositClick = useMemoizedFn(async () => {
    if (!miniSignTx || !currentPerpsAccount) {
      console.error('handleDepositClick No miniSignTx');
      return;
    }

    const txsToSign = shouldTwoStep ? twoStepCurrentTxs : miniSignTx;

    if (canUseDirectSubmitTx) {
      setIsPreparingSign(true);
      closeSign();
      try {
        const hashes = await openDirect({
          txs: txsToSign,
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
          const lastHash = hashes[hashes.length - 1];
          if (shouldTwoStep && twoStepIsApprove) {
            twoStepNext(lastHash);
          } else {
            handleSignDepositDone(lastHash);
            resetFormValue();
            onCancel();
          }
        }
      } catch (error) {
        console.error('handleDepositClick error', error);
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
          return wallet.sendRequest(
            {
              method: 'eth_sendTransaction',
              params: [tx],
              $ctx: {
                ga: {
                  category: 'Perps',
                  source: 'Perps',
                  trigger: 'Perps',
                },
              },
            },
            {
              account: currentPerpsAccount!,
            }
          );
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
      // await dispatch.account.changeAccountAsync(account);
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
              mode: 'UI',
            },
            wallet,
          },
          {}
        );
        typedDataSignatureStore.close();
      } else {
        for (const actionObj of actions) {
          const signature = await wallet.sendRequest<string>(
            {
              method: 'eth_signTypedDataV4',
              params: [account.address, JSON.stringify(actionObj)],
            },
            {
              account,
            }
          );
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

      const time = Date.now();
      let res: any;
      if (isHypeWithdraw) {
        const hypeAmount = new BigNumber(amount)
          .minus(hypeGasFeeUsd)
          .decimalPlaces(6, BigNumber.ROUND_DOWN)
          .toNumber();
        if (hypeAmount <= 0) return;
        const action = sdk.exchange.prepareSendAsset({
          destination: HYPE_EVM_BRIDGE_ADDRESS_MAP[withdrawTargetAsset],
          amount: hypeAmount.toString(),
          token: HYPE_SEND_ASSET_TOKEN_MAP[withdrawTargetAsset],
          sourceDex: isUnifiedAccount ? 'spot' : '',
          destinationDex: 'spot',
        });

        const [signature] = await executeSignTypedData(
          [action],
          currentPerpsAccount
        );

        res = await sdk.exchange.sendSendAsset({
          action: action.message as any,
          nonce: action.nonce || 0,
          signature: signature as string,
        });
      } else {
        const action = sdk.exchange.prepareWithdraw({
          amount: amount.toString(),
          destination: currentPerpsAccount.address,
        });

        const [signature] = await executeSignTypedData(
          [action],
          currentPerpsAccount
        );

        res = await sdk.exchange.sendWithdraw({
          action: action.message as any,
          nonce: action.nonce || 0,
          signature: signature as string,
        });
      }

      dispatch.perps.setLocalLoadingHistory([
        {
          // HYPE withdraw goes through `send` ledger update whose server-
          // side timestamp can be a few dozen ms earlier than the client
          // clock, leaving the time-based pending filter unable to clear
          // it. Backdate by 1s to absorb the drift (matches the desktop
          // deposit handler's `Date.now() - 1000` trick).
          time: isHypeWithdraw ? Date.now() - 1000 : Date.now(),
          hash: res.hash || '',
          type: 'withdraw',
          status: 'pending',
          usdValue: isHypeWithdraw
            ? amount.toString()
            : (amount - 1).toString(),
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
        const value = new BigNumber(withdrawMaxBalance)
          .times(percentage)
          .decimalPlaces(6, BigNumber.ROUND_DOWN)
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
                  .decimalPlaces(6, BigNumber.ROUND_DOWN)
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
                .decimalPlaces(6, BigNumber.ROUND_DOWN)
                .toFixed()
            );
          }
        } else {
          const value = new BigNumber(depositMaxUsdValue)
            .times(percentage)
            .decimalPlaces(6, BigNumber.ROUND_DOWN)
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
    return (bridgeQuote?.to_token_amount || 0) * ARB_USDC_TOKEN_ITEM.price;
  }, [bridgeQuote, isDirectDeposit, usdValue]);

  // When the user switches chain in the withdraw chain selector, reset
  // selected token to the first item of that chain and clear amount.
  const handleChainSelect = useMemoizedFn((serverChain: string) => {
    setSelectChainId(serverChain);
    setChainSelectVisible(false);
    const first = WITHDRAW_CHAIN_TOKENS[serverChain]?.[0];
    if (first) {
      setSelectedToken(first);
    }
    setUsdValue('');
  });

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
    selectChainId,
    chainSelectVisible,
    setChainSelectVisible,
    chainTokenItems,

    // Computed
    availableBalance,
    depositMaxUsdValue,
    isDirectDeposit,
    isHypeWithdraw,
    hypeTransferFee,
    hypeGasFeeUsd,
    withdrawMaxBalance,
    estReceiveUsdValue,
    tokenInfo,
    withdrawTargetAsset,

    // Two-step deposit (HYPE)
    shouldTwoStep,
    twoStepIsApprove,
    twoStepApprovePending,

    // Actions
    handlePercentageClick,
    handleTokenSelect,
    handleCloseTokenSelect,
    handleDepositClick,
    handleWithdrawClick,
    handleChainSelect,
  };
};
