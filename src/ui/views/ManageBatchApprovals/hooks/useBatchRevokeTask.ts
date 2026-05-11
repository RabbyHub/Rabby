import i18n from '@/i18n';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import {
  supportedDirectSign,
  supportedHardwareDirectSign,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { useWallet, WalletControllerType } from '@/ui/utils';
import { FailedCode, sendTransaction } from '@/ui/utils/sendTransaction';
import { useGasAccountSign } from '@/ui/views/GasAccount/hooks';
import { AssetApprovalSpender } from '@/utils/approval';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import PQueue from 'p-queue';
import React from 'react';
import { findIndexRevokeList } from '../../ManageApprovals/utils';

export { FailedCode } from '@/ui/utils/sendTransaction';

export type BatchRevokeAccountMode = 'legacy' | 'direct' | 'hardware';

export const getBatchRevokeAccountMode = (
  accountType?: string | null
): BatchRevokeAccountMode => {
  if (supportedHardwareDirectSign(accountType || '')) {
    return 'hardware';
  }

  if (supportedDirectSign(accountType || '')) {
    return 'direct';
  }

  return 'legacy';
};

export async function buildTx(
  wallet: WalletControllerType,
  item: ApprovalSpenderItemToBeRevoked
) {
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

export type AssetApprovalSpenderWithStatus = AssetApprovalSpender & {
  $status?:
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
        gasCost?: {
          gasCostUsd: BigNumber;
          gasCostAmount: BigNumber;
          nativeTokenSymbol: string;
        };
      };
};

type EthRpcLog = {
  address: string;
  blockHash: string;
  blockNumber: string;
  data: string;
  logIndex: string;
  removed: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex: string;
};

type EthTransactionReceipt = {
  blockHash: string;
  blockNumber: string;
  contractAddress: string | null;
  cumulativeGasUsed: string;
  effectiveGasPrice?: string;
  from: string;
  gasUsed: string;
  logs: EthRpcLog[];
  logsBloom: string;
  status?: string;
  to: string | null;
  transactionHash: string;
  transactionIndex: string;
  type?: string;
};

const updateAssetApprovalSpender = (
  list: AssetApprovalSpender[],
  item: AssetApprovalSpender
) => {
  const index = list.findIndex((data) => {
    if (
      data.id === item.id &&
      data.$assetParent?.id === item.$assetParent?.id &&
      (data.permit2_id || '') === (item.permit2_id || '')
    ) {
      return true;
    }
  });

  if (index >= 0) {
    list[index] = item;
  }

  return [...list];
};

const cloneAssetApprovalSpender = (item: AssetApprovalSpender) => {
  const cloneItem: AssetApprovalSpenderWithStatus = {
    ...item,
    $status: {
      status: 'pending',
    },
  };
  const cloneProperty = (key: keyof AssetApprovalSpender) => {
    const descriptor = Object.getOwnPropertyDescriptor(item, key);
    if (descriptor) {
      Object.defineProperty(cloneItem, key, descriptor);
    }
  };

  cloneProperty('$assetContract');
  cloneProperty('$assetToken');
  cloneProperty('$assetParent');

  return cloneItem;
};

export const useBatchRevokeTask = () => {
  const wallet = useWallet();
  const gasAccount = useGasAccountSign();
  const account = useCurrentAccount();
  const queueRef = React.useRef(
    new PQueue({ concurrency: 1, autoStart: true })
  );
  const [list, setList] = React.useState<AssetApprovalSpenderWithStatus[]>([]);
  const [revokeList, setRevokeList] = React.useState<
    ApprovalSpenderItemToBeRevoked[]
  >([]);
  const [status, setStatus] = React.useState<
    'idle' | 'active' | 'paused' | 'completed'
  >('idle');
  const [txStatus, setTxStatus] = React.useState<'sended' | 'signed' | 'idle'>(
    'idle'
  );
  const currentApprovalRef = React.useRef<AssetApprovalSpender>();

  const pause = useMemoizedFn(() => {
    queueRef.current.pause();
    setStatus('paused');
  });

  const addRevokeTask = useMemoizedFn(
    async (
      item: AssetApprovalSpender,
      priority: number = -1,
      ignoreGasCheck = false
    ) => {
      return queueRef.current.add(
        async () => {
          currentApprovalRef.current = item;
          const cloneItem = cloneAssetApprovalSpender(item);
          const revokeItem =
            revokeList[
              findIndexRevokeList(revokeList, {
                item: item.$assetContract!,
                spenderHost: item.$assetToken!,
                assetApprovalSpender: item,
              })
            ];

          cloneItem.$status!.status = 'pending';
          setList((prev) => updateAssetApprovalSpender(prev, cloneItem));
          try {
            const tx = await buildTx(wallet, revokeItem);
            const result = await sendTransaction({
              tx,
              ignoreGasCheck,
              wallet,
              chainServerId: revokeItem.chainServerId,
              sig: gasAccount?.sig,
              autoUseGasAccount: true,
              onProgress: (progress) => {
                if (progress === 'builded') {
                  setTxStatus('sended');
                } else if (progress === 'signed') {
                  setTxStatus('signed');
                }
              },
              onUseGasAccount: () => {
                cloneItem.$status = {
                  status: 'pending',
                  isGasAccount: true,
                };
                setList((prev) => updateAssetApprovalSpender(prev, cloneItem));
              },
              ga: {
                category: 'Security',
                source: 'tokenApproval',
              },
            });
            cloneItem.$status = {
              status: 'success',
              txHash: result.txHash,
              gasCost: result.gasCost,
            };
          } catch (error: any) {
            let failedCode = FailedCode.SubmitTxFailed;
            if (FailedCode[error?.name]) {
              failedCode = error.name;
            }

            console.error(error);
            cloneItem.$status = {
              status: 'fail',
              failedCode,
              failedReason: error?.message,
              gasCost: error?.gasCost,
            };

            if (error === 'PRESS_BACKDROP') {
              pause();
            }
          } finally {
            setList((prev) => updateAssetApprovalSpender(prev, cloneItem));
            setTxStatus('idle');
          }
        },
        { priority }
      );
    }
  );

  const start = useMemoizedFn(() => {
    setStatus('active');
    for (const item of list) {
      addRevokeTask(item);
    }
  });

  const init = useMemoizedFn(
    (
      dataSource: AssetApprovalSpender[],
      nextRevokeList: ApprovalSpenderItemToBeRevoked[]
    ) => {
      queueRef.current.clear();
      setList(dataSource);
      setRevokeList(nextRevokeList);
      setStatus('idle');
    }
  );

  const handleContinue = useMemoizedFn(() => {
    queueRef.current.start();
    setStatus('active');
  });

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

  const totalApprovals = React.useMemo(() => revokeList.length, [revokeList]);

  const revokedApprovals = React.useMemo(() => {
    return list.filter((item) => item.$status?.status === 'success').length;
  }, [list]);

  const currentApprovalIndex = React.useMemo(() => {
    return list.findIndex((item) => item.$status?.status === 'pending');
  }, [list]);

  const resetCurrent = useMemoizedFn(() => {
    if (currentApprovalRef.current) {
      addRevokeTask(currentApprovalRef.current, 0);
    }
  });

  return {
    list,
    init,
    start,
    continue: handleContinue,
    pause,
    status,
    txStatus,
    addRevokeTask,
    totalApprovals,
    revokedApprovals,
    currentApprovalIndex,
    currentApprovalRef,
    resetCurrent,
  };
};

export type BatchRevokeTaskType = ReturnType<typeof useBatchRevokeTask>;
