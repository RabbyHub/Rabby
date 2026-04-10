import { Account } from '@/background/service/preference';
import { DEX } from '@/constant';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { useRabbySelector } from '@/ui/store';
import { formatAmount, useWallet, WalletControllerType } from '@/ui/utils';
import { waitForTxCompleted } from '@/ui/utils/transaction';
import { useGasAccountSign } from '@/ui/views/GasAccount/hooks';
import { findChain } from '@/utils/chain';
import { Chain, CHAINS_ENUM } from '@debank/common';
import {
  ExplainTxResponse,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { DEX_ENUM, DEX_SPENDER_WHITELIST } from '@rabby-wallet/rabby-swap';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import { last, random } from 'lodash';
import PQueue from 'p-queue';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isSwapWrapToken,
  QuoteProvider,
  TDexQuoteData,
  useQuoteMethods,
} from '../../Swap/hooks';
import { twoStepChains } from '../../Swap/hooks/twoStepSwap';
import { DEFAULT_MAX_GAS_COST, DEFAULT_SLIPPAGE } from '../constant';
export { FailedCode } from '@/ui/utils/sendTransaction';

const TASK_CANCELLED_ERROR_NAME = 'BatchSwapTaskCancelled';

const createNamedError = (name: string, message?: string) => {
  const error = new Error(message || name);
  error.name = name;
  return error;
};

const createTaskCancelledError = () => {
  return createNamedError(
    TASK_CANCELLED_ERROR_NAME,
    'Batch swap task cancelled'
  );
};

export const getActiveProvider = async ({
  chain,
  currentAddress,
  dexId,
  getSingleQuote,
  payToken,
  receiveToken,
  slippage = '3',
}: {
  chain: NonNullable<ReturnType<typeof findChain>>;
  currentAddress: string;
  dexId: DEX_ENUM;
  getSingleQuote: (params: {
    dexId: DEX_ENUM;
    userAddress: string;
    payToken: TokenItem;
    receiveToken: TokenItem;
    slippage: string;
    chain: CHAINS_ENUM;
    payAmount: string;
    fee: string;
    inSufficient: boolean;
    setQuote?: (quote: TDexQuoteData) => void;
  }) => Promise<TDexQuoteData>;
  payToken: TokenItem;
  receiveToken: TokenItem;
  slippage?: string;
}): Promise<QuoteProvider | null> => {
  const payAmount = new BigNumber(payToken.raw_amount_hex_str || 0)
    .div(10 ** payToken.decimals)
    .toString(10);

  if (!new BigNumber(payAmount).gt(0)) {
    return null;
  }

  const quoteResult = await getSingleQuote({
    dexId,
    userAddress: currentAddress,
    payToken,
    receiveToken,
    slippage,
    chain: chain.enum,
    payAmount,
    fee: isSwapWrapToken(payToken.id, receiveToken.id, chain.enum)
      ? '0'
      : '0.25',
    inSufficient: false,
  });

  if (!quoteResult?.data || !quoteResult.preExecResult?.isSdkPass) {
    return null;
  }

  const actualReceiveAmount = new BigNumber(quoteResult.data.toTokenAmount)
    .div(10 ** (quoteResult.data.toTokenDecimals || receiveToken.decimals))
    .toString();

  return {
    name: quoteResult.name,
    quote: quoteResult.data,
    preExecResult: quoteResult.preExecResult,
    gasPrice: quoteResult.preExecResult.gasPrice,
    shouldApproveToken: !!quoteResult.preExecResult.shouldApproveToken,
    shouldTwoStepApprove: !!quoteResult.preExecResult.shouldTwoStepApprove,
    error: !quoteResult.preExecResult,
    halfBetterRate: '',
    quoteWarning: undefined,
    actualReceiveAmount,
    gasUsd: quoteResult.preExecResult.gasUsd,
  };
};

export const buildSwapTxs = async ({
  wallet,
  payToken,
  receiveToken,
  quote,
  activeProvider,

  preferMEVGuarded,
  chain,
  inputAmount,
  slippage,
  userAddress,
  rbiSource,
  swapUseSlider,
}: {
  wallet: WalletControllerType;
  payToken: TokenItem | null;
  receiveToken: TokenItem | null;
  quote: TDexQuoteData | null;
  activeProvider: QuoteProvider | null;
  preferMEVGuarded: boolean;
  chain: CHAINS_ENUM;
  inputAmount: string;
  slippage: string;
  userAddress: string;
  rbiSource: any;
  swapUseSlider?: boolean;
}) => {
  const quoteResult = activeProvider?.quote || quote?.data;

  if (!payToken || !receiveToken || !quoteResult || !activeProvider) {
    return;
  }

  try {
    const toAmount = new BigNumber(quoteResult.toTokenAmount)
      .div(10 ** (quoteResult.toTokenDecimals || receiveToken.decimals))
      .toNumber();

    const result = await wallet.buildDexSwap(
      {
        swapPreferMEVGuarded: preferMEVGuarded,
        chain,
        quote: quoteResult,
        needApprove: activeProvider.shouldApproveToken,
        spender:
          activeProvider.name === DEX_ENUM.WRAPTOKEN
            ? ''
            : DEX_SPENDER_WHITELIST[activeProvider.name][chain],
        pay_token_id: payToken.id,
        unlimited: false,
        shouldTwoStepApprove: activeProvider.shouldTwoStepApprove,
        gasPrice: undefined,
        postSwapParams: {
          quote: {
            pay_token_id: payToken.id,
            pay_token_amount: Number(inputAmount),
            receive_token_id: receiveToken.id,
            receive_token_amount: toAmount,
            slippage: new BigNumber(slippage).div(100).toNumber(),
          },
          dex_id: activeProvider.name || 'WrapToken',
        },
        addHistoryData: {
          address: userAddress,
          chainId: findChain({ enum: chain })?.id || 0,
          fromToken: payToken,
          toToken: receiveToken,
          fromAmount: Number(inputAmount),
          toAmount,
          slippage: new BigNumber(slippage).div(100).toNumber(),
          dexId: activeProvider.name || 'WrapToken',
          status: 'pending',
          createdAt: Date.now(),
        },
      },
      {
        ga: {
          category: 'Swap',
          source: 'swap',
          trigger: rbiSource,
          swapUseSlider,
        },
      }
    );

    return result;
  } catch (error) {
    console.error(error);
  }
};

export type TaskItemStatus =
  | {
      status: 'idle';
      message?: string;
    }
  | {
      status: 'pending';
      isGasAccount?: boolean;
      message?: string;
    }
  | {
      status: 'failed';
      createdAt?: number;
      message?: string;
    }
  | {
      status: 'success';
      txHash: string;
      preExecResult?: ExplainTxResponse;
      actualReceiveAmount?: string | number;
      createdAt?: number;
      message?: string;
    };

export const useBatchSwapTask = (options: {
  chain?: Chain;
  account?: Account;
  receiveToken?: TokenItem;
}) => {
  const { receiveToken, account, chain } = options;
  const wallet = useWallet();
  const { t } = useTranslation();
  const gasAccount = useGasAccountSign();
  const queueRef = React.useRef(
    new PQueue({ concurrency: 1, autoStart: true })
  );
  const [list, setList] = React.useState<TokenItem[]>([]);
  const [statusDict, setStatusDict] = React.useState<
    Record<string, TaskItemStatus>
  >({});

  const [config, setConfig] = React.useState<{
    slippage: string;
    maxGasCost: string;
  }>({
    slippage: DEFAULT_SLIPPAGE,
    maxGasCost: DEFAULT_MAX_GAS_COST,
  });

  const [status, setStatus] = React.useState<
    'idle' | 'active' | 'paused' | 'completed'
  >('idle');
  const statusRef = React.useRef<'idle' | 'active' | 'paused' | 'completed'>(
    'idle'
  );
  const [txStatus, setTxStatus] = React.useState<'sended' | 'signed' | 'idle'>(
    'idle'
  );
  const cancelTokenRef = React.useRef(0);
  const currentApprovalRef = React.useRef<TokenItem>();
  const [currentToken, setCurrentToken] = React.useState<TokenItem | null>(
    null
  );
  const { getSingleQuote } = useQuoteMethods();

  const { openDirect, prefetch, close: closeSign } = useMiniSigner({
    account: account!,
    chainServerId: chain?.serverId || '',
    autoResetGasStoreOnChainChange: true,
  });

  const dexList = useRabbySelector((s) => {
    return s.swap.supportedDEXList.filter((e) => DEX[e]);
  });

  const getDexId = useMemoizedFn(() => {
    const randomIndex = random(0, dexList.length - 1);
    return dexList[randomIndex] as DEX_ENUM;
  });

  const updateStatus = React.useCallback(
    (nextStatus: 'idle' | 'active' | 'paused' | 'completed') => {
      statusRef.current = nextStatus;
      setStatus(nextStatus);
    },
    []
  );

  const cancelRunningTasks = useMemoizedFn(() => {
    cancelTokenRef.current += 1;
    queueRef.current.pause();
    queueRef.current.clear();
    closeSign();
  });

  const addTask = useMemoizedFn(
    async (item: TokenItem, priority: number = 0, ignoreGasCheck = false) => {
      const taskToken = cancelTokenRef.current;
      const isTaskCancelled = () => cancelTokenRef.current !== taskToken;
      const throwIfTaskCancelled = () => {
        if (isTaskCancelled()) {
          throw createTaskCancelledError();
        }
      };

      return queueRef.current.add(
        async () => {
          try {
            throwIfTaskCancelled();
            closeSign();

            const dexId = getDexId();

            if (
              !options.chain ||
              !options.account ||
              !options.receiveToken ||
              !dexId
            ) {
              throw new Error(
                t('page.desktopSmallSwap.failReason.quoteUnavailable')
              );
            }
            currentApprovalRef.current = item;
            setCurrentToken(item);

            setStatusDict((prev) => ({
              ...prev,
              [item.id]: {
                status: 'pending',
                message: t('page.desktopSmallSwap.status.pending'),
              },
            }));

            const activeProvider = await getActiveProvider({
              chain: options.chain,
              currentAddress: options.account.address,
              dexId,
              getSingleQuote,
              payToken: item,
              receiveToken: options.receiveToken,
              slippage: config.slippage,
            });

            throwIfTaskCancelled();

            // 获取报价失败
            if (!activeProvider) {
              throw new Error(
                t('page.desktopSmallSwap.failReason.quoteUnavailable')
              );
            }

            // gas 费用超过预设值
            if (
              !activeProvider.preExecResult ||
              new BigNumber(
                activeProvider.preExecResult.gasUsdValue
              ).isGreaterThan(config.maxGasCost)
            ) {
              throw new Error(
                t('page.desktopSmallSwap.failReason.gasCostTooHigh')
              );
            }

            const fromUsdBn = new BigNumber(item.amount || 0).times(
              item.price || 0
            );
            const toUsdBn = new BigNumber(
              activeProvider.actualReceiveAmount || 0
            ).times(options.receiveToken?.price || 0);

            const priceImpact = toUsdBn
              .minus(fromUsdBn)
              .div(fromUsdBn)
              .times(100);

            // 价差过大
            if (priceImpact.lte(-20)) {
              throw new Error(
                t('page.desktopSmallSwap.failReason.priceImpactTooHigh')
              );
            }

            const txs = await buildSwapTxs({
              wallet,
              payToken: item,
              receiveToken: options.receiveToken,
              quote: null,
              activeProvider,
              preferMEVGuarded: false,
              chain: options.chain.enum,
              inputAmount: new BigNumber(item.raw_amount_hex_str || 0)
                .div(10 ** item.decimals)
                .toString(10),
              slippage: config.slippage,
              userAddress: options.account.address,
              rbiSource: 'desktopSmallSwap',
              swapUseSlider: false,
            });

            throwIfTaskCancelled();

            // 构建交易数据失败
            if (!txs?.length) {
              throw new Error(
                t('page.desktopSmallSwap.failReason.submitFailed')
              );
            }

            const result: {
              txHash: string;
              preExecResult?: ExplainTxResponse;
              isSimulationFailed?: boolean;
            } = { txHash: '' };

            throwIfTaskCancelled();

            // let pushType: TxPushType = 'default';
            // if ('swapPreferMEVGuarded' in tx) {
            //   if (tx.swapPreferMEVGuarded) {
            //     pushType = 'mev';
            //   }
            //   delete tx.swapPreferMEVGuarded;
            // }

            const txsArray = twoStepChains.includes(options.chain.enum)
              ? txs.map((tx) => [tx])
              : [txs];

            for (const txsGroup of txsArray) {
              await prefetch({
                txs: txsGroup,
                onPreExecChange(p) {
                  console.log('preExec change', p);
                  result.preExecResult = p;
                },
                onPreExecError() {
                  console.log('preExec error');
                  result.isSimulationFailed = true;
                },
              });
              const res = await openDirect({
                txs: txsGroup,
                onPreExecError() {
                  result.isSimulationFailed = true;
                },
                isHideErrorUI: true,
              });

              result.txHash = last(res) || '';
              if (result.txHash) {
                try {
                  await waitForTxCompleted({
                    hash: result.txHash,
                    wallet,
                    chainServerId: options.chain.serverId,
                  });
                } catch (e) {
                  throw new Error(
                    t('page.desktopSmallSwap.failReason.transactionFailed')
                  );
                }
              }
            }

            // result = await sendTransaction({
            //   tx,
            //   ignoreGasCheck,
            //   wallet,
            //   chainServerId: options.chain.serverId,
            //   sig: gasAccount?.sig,
            //   autoUseGasAccount: true,
            //   pushType,
            //   onProgress: (status) => {
            //     if (isTaskCancelled()) {
            //       return;
            //     }

            //     if (status === 'builded') {
            //       setTxStatus('sended');
            //     } else if (status === 'signed') {
            //       setTxStatus('signed');
            //     }
            //   },
            //   ga: {
            //     category: 'Swap',
            //     source: 'swap',
            //   },
            // });
            console.log('sendTransaction result', result);
            throwIfTaskCancelled();
            // 预执行失败
            if (result.isSimulationFailed) {
              console.error('simulation failed', result.preExecResult);
              throw new Error(
                t('page.desktopSmallSwap.failReason.submitFailed')
              );
            }
            // 提交交易失败
            if (!result?.txHash) {
              throw new Error(
                t('page.desktopSmallSwap.failReason.submitFailed')
              );
            }

            throwIfTaskCancelled();

            setStatusDict((prev) => ({
              ...prev,
              [item.id]: {
                status: 'success',
                createdAt: Date.now(),
                preExecResult: result!.preExecResult,
                actualReceiveAmount: activeProvider.actualReceiveAmount,
                txHash: result!.txHash,
                message: t('page.desktopSmallSwap.status.success'),
              },
            }));
          } catch (e) {
            if (e?.name === TASK_CANCELLED_ERROR_NAME) {
              return;
            }

            console.log('batch swap task error', e);
            console.error('transaction error', e, e.message);
            if (!isTaskCancelled()) {
              setStatusDict((prev) => ({
                ...prev,
                [item.id]: {
                  status: 'failed',
                  message:
                    e === 'Gas not enough'
                      ? t('page.desktopSmallSwap.failReason.gasNotEnough')
                      : e.message ||
                        t('page.desktopSmallSwap.failReason.submitFailed'),
                  createdAt: Date.now(),
                },
              }));
            }
          } finally {
            if (!isTaskCancelled()) {
              setTxStatus('idle');
              closeSign();
            }
            // setCurrentToken(null);
          }
        },
        { priority }
      );
    }
  );

  const start = React.useCallback(() => {
    updateStatus('active');

    for (const item of list) {
      addTask(item, 0, true);
    }
    if (queueRef.current.isPaused) {
      queueRef.current.start();
    }
  }, [addTask, list, updateStatus]);

  const init = React.useCallback(
    (dataSource: TokenItem[]) => {
      cancelRunningTasks();
      setList(dataSource);
      setStatusDict(
        dataSource.reduce((dict, item) => {
          dict[item.id] = {
            status: 'idle',
            message: t('page.desktopSmallSwap.status.idle'),
          };
          return dict;
        }, {} as Record<string, TaskItemStatus>)
      );
      setTxStatus('idle');
      setCurrentToken(null);
      updateStatus('idle');
    },
    [cancelRunningTasks, updateStatus]
  );

  const pause = React.useCallback(() => {
    queueRef.current.pause();
    updateStatus('paused');
  }, [updateStatus]);

  const handleContinue = React.useCallback(() => {
    queueRef.current.start();
    updateStatus('active');
  }, [updateStatus]);

  React.useEffect(() => {
    queueRef.current.on('error', (error) => {
      console.error('Queue error:', error);
    });

    queueRef.current.on('idle', () => {
      if (statusRef.current === 'active' || statusRef.current === 'paused') {
        updateStatus('completed');
      }
    });

    return () => {
      cancelRunningTasks();
    };
  }, [cancelRunningTasks, updateStatus]);

  const expectReceiveUsd = useMemo(() => {
    return (list || []).reduce((sum, item) => {
      return sum + (item.amount * item.price || 0);
    }, 0);
  }, [list]);

  const expectReceiveAmount = useMemo(() => {
    if (!options.receiveToken?.price) {
      return '0';
    }
    return formatAmount(expectReceiveUsd / options.receiveToken.price);
  }, [expectReceiveUsd, options.receiveToken]);

  const finalReceive = useMemo(() => {
    let totalUsd = 0;
    let totalAmount = 0;

    Object.values(statusDict).forEach((item) => {
      if (item.status === 'success') {
        if (
          item.preExecResult &&
          item.preExecResult.pre_exec_version !== 'v0' &&
          item.preExecResult.balance_change.success
        ) {
          item.preExecResult.balance_change?.receive_token_list?.forEach(
            (token) => {
              if (token.id === options.receiveToken?.id) {
                totalUsd += token.amount * token.price || 0;
                totalAmount += token.amount || 0;
              }
            }
          );
        } else {
          totalUsd +=
            (Number(item.actualReceiveAmount || 0) *
              (options.receiveToken?.price || 0) || 0) *
            (1 - Number(config.slippage) / 100);
          totalAmount +=
            (Number(item.actualReceiveAmount || 0) || 0) *
            (1 - Number(config.slippage) / 100);
        }
      }
    });
    return {
      usd: totalUsd,
      amount: totalAmount,
    };
  }, [statusDict, options.receiveToken?.id]);

  const currentTaskIndex = React.useMemo(() => {
    return list.findIndex((item) => statusDict[item.id]?.status === 'pending');
  }, [list, statusDict]);

  const clear = useMemoizedFn(() => {
    cancelRunningTasks();
    setList([]);
    setStatusDict({});
    setTxStatus('idle');
    setCurrentToken(null);
    updateStatus('idle');
  });

  const stop = useMemoizedFn(() => {
    // cancelRunningTasks();
    setList([]);
    setCurrentToken(null);
    updateStatus('completed');
  });

  const disabled = useMemo(() => {
    return status === 'active' || status === 'paused';
  }, [status]);

  return {
    statusDict,
    list,
    init,
    start,
    continue: handleContinue,
    pause,
    stop,
    status,
    txStatus,
    addTask,
    currentToken,
    currentTaskIndex,
    currentApprovalRef,
    clear,
    config,
    setConfig,
    expectReceive: {
      usd: expectReceiveUsd,
      amount: expectReceiveAmount,
    },
    finalReceive,
    disabled,
  };
};

export type BatchSwapTaskType = ReturnType<typeof useBatchSwapTask>;
