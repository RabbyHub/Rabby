import { useWallet, WalletControllerType } from '@/ui/utils';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { AssetApprovalSpender } from '@/utils/approval';
import { TokenItem, Tx, TxPushType } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import PQueue from 'p-queue';
import React from 'react';
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
export { FailedCode } from '@/ui/utils/sendTransaction';

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
      status: 'pending';
      isGasAccount?: boolean;
    }
  | {
      status: 'fail';
      failedCode: FailedCode;
      failedReason?: string;
      gasCost?: {
        gasCostUsd: BigNumber;
      };
    }
  | {
      status: 'success';
      txHash: string;
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
  slippage?: string;
  maxGasCost?: string;
}) => {
  const wallet = useWallet();
  const gasAccount = useGasAccountSign();
  const queueRef = React.useRef(
    new PQueue({ concurrency: 1, autoStart: true })
  );
  const [list, setList] = React.useState<TokenItem[]>([]);
  const [statusDict, setStatusDict] = React.useState<
    Record<string, TaskItemStatus>
  >({});

  const [status, setStatus] = React.useState<
    'idle' | 'active' | 'paused' | 'completed'
  >('idle');
  const [txStatus, setTxStatus] = React.useState<'sended' | 'signed' | 'idle'>(
    'idle'
  );
  const currentApprovalRef = React.useRef<TokenItem>();
  const [currentToken, setCurrentToken] = React.useState<TokenItem | null>(
    null
  );
  const { getSingleQuote } = useQuoteMethods();
  const supportedDEXList = useRabbySelector((s) => s.swap.supportedDEXList);
  const dexId = (supportedDEXList.filter((e) => DEX[e]) as DEX_ENUM[])[0];

  const addTask = useMemoizedFn(
    async (item: TokenItem, priority: number = 0, ignoreGasCheck = false) => {
      return queueRef.current.add(
        async () => {
          try {
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
              slippage: options.slippage,
            });

            console.log('Got active provider:', activeProvider);

            if (!activeProvider) {
              throw new Error('Failed to get active provider');
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
              slippage: options.slippage || '3',
              userAddress: options.account.address,
              rbiSource: 'desktopSmallSwap',
              swapUseSlider: false,
            });

            console.log('Built swap txs:', txs);

            if (!txs?.length) {
              throw new Error('Failed to build swap txs');
            }

            let result: Awaited<ReturnType<typeof sendTransaction>> | undefined;

            for (const tx of txs) {
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
            }

            if (!result) {
              throw new Error('Failed to send swap tx');
            }

            setStatusDict((prev) => ({
              ...prev,
              [item.id]: {
                status: 'success',
                txHash: result!.txHash,
                gasCost: result!.gasCost,
              },
            }));
          } catch (e) {
            let failedCode = FailedCode.DefaultFailed;
            if (FailedCode[e.name]) {
              failedCode = e.name;
            }

            console.error(e);
            setStatusDict((prev) => ({
              ...prev,
              [item.id]: {
                status: 'fail',
                failedCode: failedCode,
                failedReason: e.message,
                gasCost: e.gasCost,
              },
            }));
          } finally {
            setTxStatus('idle');
            // setCurrentToken(null);
          }
        },
        { priority }
      );
    }
  );

  const start = React.useCallback(() => {
    setStatus('active');
    for (const item of list) {
      addTask(item);
    }
  }, [list]);

  const init = React.useCallback((dataSource: TokenItem[]) => {
    queueRef.current.clear();
    setList(dataSource);
    setStatusDict({});
    setCurrentToken(null);
    setStatus('idle');
  }, []);

  const pause = React.useCallback(() => {
    queueRef.current.pause();
    setStatus('paused');
  }, []);

  const handleContinue = React.useCallback(() => {
    queueRef.current.start();
    setStatus('active');
  }, []);

  React.useEffect(() => {
    queueRef.current.on('error', (error) => {
      console.error('Queue error:', error);
    });

    queueRef.current.on('idle', () => {
      setStatus('completed');
    });

    return () => {
      queueRef.current.clear();
    };
  }, []);

  const currentTaskIndex = React.useMemo(() => {
    return list.findIndex((item) => statusDict[item.id]?.status === 'pending');
  }, [list, statusDict]);

  const clear = React.useCallback(() => {
    queueRef.current.clear();
    setList([]);
    setStatusDict({});
    setCurrentToken(null);
    setStatus('idle');
  }, []);

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
  };
};

export type BatchSwapTaskType = ReturnType<typeof useBatchSwapTask>;
