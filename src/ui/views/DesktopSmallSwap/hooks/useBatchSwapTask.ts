import { useWallet, WalletControllerType } from '@/ui/utils';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { AssetApprovalSpender } from '@/utils/approval';
import { TokenItem, Tx } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import PQueue from 'p-queue';
import React from 'react';
import i18n from '@/i18n';
import { FailedCode, sendTransaction } from '@/ui/utils/sendTransaction';
import { useGasAccountSign } from '@/ui/views/GasAccount/hooks';
import { findIndexRevokeList } from '../../DesktopProfile/components/ApprovalsTabPane/utils';
import { findChain } from '@/utils/chain';
import { DEX_ENUM, DEX_SPENDER_WHITELIST } from '@rabby-wallet/rabby-swap';
import { CHAINS_ENUM } from '@debank/common';
import { QuoteProvider, TDexQuoteData } from '../../Swap/hooks';
export { FailedCode } from '@/ui/utils/sendTransaction';

export const buildSwapTxs = async ({
  wallet,
  payToken,
  receiveToken,

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
  // if (payToken && receiveToken && activeProvider?.quote) {
  //   try {
  //     const result = await wallet.buildDexSwap(
  //       {
  //         swapPreferMEVGuarded: preferMEVGuarded,
  //         chain,
  //         quote: activeProvider?.quote,
  //         needApprove: activeProvider.shouldApproveToken,
  //         spender:
  //           activeProvider?.name === DEX_ENUM.WRAPTOKEN
  //             ? ''
  //             : DEX_SPENDER_WHITELIST[activeProvider.name][chain],
  //         pay_token_id: payToken.id,
  //         unlimited: false,
  //         shouldTwoStepApprove: activeProvider.shouldTwoStepApprove,
  //         // todo check this
  //         gasPrice: undefined,
  //         postSwapParams: {
  //           quote: {
  //             pay_token_id: payToken.id,
  //             pay_token_amount: Number(inputAmount),
  //             receive_token_id: receiveToken!.id,
  //             receive_token_amount: new BigNumber(
  //               activeProvider?.quote.toTokenAmount
  //             )
  //               .div(
  //                 10 **
  //                   (activeProvider?.quote.toTokenDecimals ||
  //                     receiveToken.decimals)
  //               )
  //               .toNumber(),
  //             slippage: new BigNumber(slippage).div(100).toNumber(),
  //           },
  //           dex_id: activeProvider?.name || 'WrapToken',
  //         },
  //         addHistoryData: {
  //           address: userAddress,
  //           chainId: findChain({ enum: chain })?.id || 0,
  //           fromToken: payToken,
  //           toToken: receiveToken,
  //           fromAmount: Number(inputAmount),
  //           toAmount: new BigNumber(activeProvider?.quote.toTokenAmount)
  //             .div(
  //               10 **
  //                 (activeProvider?.quote.toTokenDecimals ||
  //                   receiveToken.decimals)
  //             )
  //             .toNumber(),
  //           slippage: new BigNumber(slippage).div(100).toNumber(),
  //           dexId: activeProvider?.name || 'WrapToken',
  //           status: 'pending',
  //           createdAt: Date.now(),
  //         },
  //       },
  //       {
  //         ga: {
  //           category: 'Swap',
  //           source: 'swap',
  //           trigger: rbiSource,
  //           swapUseSlider,
  //         },
  //       }
  //     );
  //     return result;
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }
};

async function buildTx(
  wallet: WalletControllerType,
  item: ApprovalSpenderItemToBeRevoked
) {
  // generate tx
  let tx: Tx;
  if (item.permit2Id) {
    const data = await wallet.lockdownPermit2(
      {
        id: item.permit2Id,
        chainServerId: item.chainServerId,
        tokenSpenders: [
          {
            token: item.tokenId!,
            spender: item.spender,
          },
        ],
      },
      true
    );
    tx = data.params[0];
  } else if ('nftTokenId' in item) {
    const data = await wallet.revokeNFTApprove(item, undefined, true);
    tx = data.params[0];
  } else {
    const data = await wallet.approveToken(
      item.chainServerId,
      item.id,
      item.spender,
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
    tx = data.params[0];
  }

  return tx;
}

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

export const useBatchSwapTask = () => {
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

  const addTask = React.useCallback(
    async (item: TokenItem, priority: number = 0, ignoreGasCheck = false) => {
      return queueRef.current.add(
        async () => {
          currentApprovalRef.current = item;
          setCurrentToken(item);

          setStatusDict((prev) => ({
            ...prev,
            [item.id]: {
              status: 'pending',
            },
          }));

          try {
            // todo build swap tx and send
            // const tx = await buildTx(wallet, revokeItem);
            // const result = await sendTransaction({
            //   tx,
            //   ignoreGasCheck,
            //   wallet,
            //   chainServerId: revokeItem.chainServerId,
            //   sig: gasAccount?.sig,
            //   autoUseGasAccount: true,
            //   onProgress: (status) => {
            //     if (status === 'builded') {
            //       setTxStatus('sended');
            //     } else if (status === 'signed') {
            //       setTxStatus('signed');
            //     }
            //   },
            //   onUseGasAccount: () => {
            //     // update status
            //     cloneItem.$status = {
            //       status: 'pending',
            //       isGasAccount: true,
            //     };
            //     setList((prev) => updateAssetApprovalSpender(prev, cloneItem));
            //   },
            //   ga: {
            //     category: 'Security',
            //     source: 'tokenApproval',
            //   },
            // });
            // update status
            const result = await new Promise<any>((resolve, reject) => {
              setTimeout(() => {
                if (Math.random() > 0.5) {
                  resolve({
                    txHash: '0x123',
                    gasCost: {
                      gasCostUsd: new BigNumber(1),
                      gasCostAmount: new BigNumber(0.01),
                      nativeTokenSymbol: 'ETH',
                    },
                  });
                } else {
                  reject(new Error('Failed to send transaction'));
                }
              }, 3000);
            });
            setStatusDict((prev) => ({
              ...prev,
              [item.id]: {
                status: 'success',
                txHash: result.txHash,
                gasCost: result.gasCost,
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
    },
    []
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
