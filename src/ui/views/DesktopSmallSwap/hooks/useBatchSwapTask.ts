import { formatAmount, useWallet, WalletControllerType } from '@/ui/utils';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { AssetApprovalSpender } from '@/utils/approval';
import {
  ExplainTxResponse,
  TokenItem,
  Tx,
  TxPushType,
} from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import PQueue from 'p-queue';
import React, { useMemo } from 'react';
import i18n from '@/i18n';
import { FailedCode, sendTransaction } from '@/ui/utils/sendTransaction';
import { useGasAccountSign } from '@/ui/views/GasAccount/hooks';
import { findIndexRevokeList } from '../../DesktopProfile/components/ApprovalsTabPane/utils';
import { findChain } from '@/utils/chain';
import { DEX_ENUM, DEX_SPENDER_WHITELIST } from '@rabby-wallet/rabby-swap';
import { Chain, CHAINS_ENUM } from '@debank/common';
import { isSwapWrapToken, useQuoteMethods } from '../../Swap/hooks';
import { QuoteProvider, TDexQuoteData } from '../../Swap/hooks';
import { useRabbySelector } from '@/ui/store';
import { DEX } from '@/constant';
import { useMemoizedFn } from 'ahooks';
import { Account } from '@/background/service/preference';
import { omit } from 'lodash';
import { DEFAULT_MAX_GAS_COST, DEFAULT_SLIPPAGE } from '../constant';
import { format } from 'path';
export { FailedCode } from '@/ui/utils/sendTransaction';

const TASK_CANCELLED_ERROR_NAME = 'BatchSwapTaskCancelled';

const createTaskCancelledError = () => {
  const error = new Error('Batch swap task cancelled');
  error.name = TASK_CANCELLED_ERROR_NAME;
  return error;
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

  console.log('???', quoteResult);

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

export const FailReason = {
  [FailedCode.GasNotEnough]: i18n.t('page.approvals.revokeModal.gasNotEnough'),
  [FailedCode.GasTooHigh]: i18n.t('page.approvals.revokeModal.gasTooHigh'),
  [FailedCode.SubmitTxFailed]: i18n.t(
    'page.approvals.revokeModal.submitTxFailed'
  ),
  [FailedCode.DefaultFailed]: i18n.t(
    'page.approvals.revokeModal.defaultFailed'
  ),
  [FailedCode.SimulationFailed]: i18n.t(
    'page.approvals.revokeModal.simulationFailed'
  ),
};

export type TaskItemStatus =
  | {
      status: 'idle';
    }
  | {
      status: 'pending';
      isGasAccount?: boolean;
    }
  | {
      status: 'failed';
      failedCode: FailedCode;
      failedReason?: string;
      gasCost?: {
        gasCostUsd: BigNumber;
      };
    }
  | {
      status: 'success';
      txHash: string;
      preExecResult?: ExplainTxResponse;
      gasCost: {
        gasCostUsd: BigNumber;
        gasCostAmount: BigNumber;
        nativeTokenSymbol: string;
      };
    };

export const useBatchSwapTask = (options: {
  chain?: Chain;
  account?: Account;
  receiveToken?: TokenItem;
}) => {
  const { receiveToken } = options;
  const wallet = useWallet();
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
  const supportedDEXList = useRabbySelector((s) => s.swap.supportedDEXList);
  const dexId = (supportedDEXList.filter((e) => DEX[e]) as DEX_ENUM[])[0];

  const updateStatus = React.useCallback(
    (nextStatus: 'idle' | 'active' | 'paused' | 'completed') => {
      statusRef.current = nextStatus;
      setStatus(nextStatus);
    },
    []
  );

  const cancelRunningTasks = React.useCallback(() => {
    cancelTokenRef.current += 1;
    queueRef.current.pause();
    queueRef.current.clear();
  }, []);

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

            if (
              !options.chain ||
              !options.account ||
              !options.receiveToken ||
              !dexId
            ) {
              throw new Error('Missing required parameters');
            }
            currentApprovalRef.current = item;
            setCurrentToken(item);

            setStatusDict((prev) => ({
              ...prev,
              [item.id]: {
                status: 'pending',
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

            console.log('Got active provider:', activeProvider);

            if (!activeProvider) {
              throw new Error('Failed to get active provider');
            }

            // 预执行失败 ｜ gas 费用过高
            if (
              !activeProvider.preExecResult ||
              new BigNumber(
                activeProvider.preExecResult.gasUsdValue
              ).isGreaterThan(config.maxGasCost)
            ) {
              throw new Error('Gas cost is too high');
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

            console.log('Built swap txs:', txs);

            if (!txs?.length) {
              throw new Error('Failed to build swap txs');
            }

            let result: Awaited<ReturnType<typeof sendTransaction>> | undefined;

            for (const tx of txs) {
              throwIfTaskCancelled();

              let pushType: TxPushType = 'default';
              if ('swapPreferMEVGuarded' in tx) {
                if (tx.swapPreferMEVGuarded) {
                  pushType = 'mev';
                }
                delete tx.swapPreferMEVGuarded;
              }
              result = await sendTransaction({
                tx,
                ignoreGasCheck,
                wallet,
                chainServerId: options.chain.serverId,
                sig: gasAccount?.sig,
                autoUseGasAccount: true,
                pushType,
                onProgress: (status) => {
                  if (isTaskCancelled()) {
                    return;
                  }

                  if (status === 'builded') {
                    setTxStatus('sended');
                  } else if (status === 'signed') {
                    setTxStatus('signed');
                  }
                },
                ga: {
                  category: 'Swap',
                  source: 'swap',
                },
              });

              throwIfTaskCancelled();
            }

            if (!result) {
              throw new Error('Failed to send swap tx');
            }

            throwIfTaskCancelled();

            console.log('Swap tx result:', result);

            setStatusDict((prev) => ({
              ...prev,
              [item.id]: {
                status: 'success',
                preExecResult: result!.preExecResult,
                txHash: result!.txHash,
                gasCost: result!.gasCost,
              },
            }));
          } catch (e) {
            if (e?.name === TASK_CANCELLED_ERROR_NAME) {
              return;
            }

            let failedCode = FailedCode.DefaultFailed;
            if (FailedCode[e.name]) {
              failedCode = e.name;
            }

            console.error(e);
            if (!isTaskCancelled()) {
              setStatusDict((prev) => ({
                ...prev,
                [item.id]: {
                  status: 'failed',
                  failedCode: failedCode,
                  failedReason: e.message,
                  gasCost: e.gasCost,
                },
              }));
            }
          } finally {
            if (!isTaskCancelled()) {
              setTxStatus('idle');
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
      addTask(item);
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

  console.log('queueRef.current', queueRef.current);

  const handleContinue = React.useCallback(() => {
    queueRef.current.start();
    updateStatus('active');
  }, [updateStatus]);

  React.useEffect(() => {
    queueRef.current.on('error', (error) => {
      console.error('Queue error:', error);
    });

    queueRef.current.on('idle', () => {
      console.log('All tasks completed');
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
      if (item.status === 'success' && item.preExecResult) {
        item.preExecResult.balance_change?.receive_token_list?.forEach(
          (token) => {
            if (token.id === options.receiveToken?.id) {
              totalUsd += token.amount * token.price || 0;
              totalAmount += token.amount || 0;
            }
          }
        );
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

  const clear = React.useCallback(() => {
    cancelRunningTasks();
    setList([]);
    setStatusDict({});
    setTxStatus('idle');
    setCurrentToken(null);
    updateStatus('idle');
  }, [cancelRunningTasks, updateStatus]);

  return {
    statusDict,
    list,
    init,
    start,
    continue: handleContinue,
    pause,
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
  };
};

export type BatchSwapTaskType = ReturnType<typeof useBatchSwapTask>;
