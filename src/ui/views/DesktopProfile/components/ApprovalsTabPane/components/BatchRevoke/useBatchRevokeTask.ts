import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useWallet, WalletControllerType } from '@/ui/utils';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { AssetApprovalSpender } from '@/utils/approval';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import PQueue from 'p-queue';
import React from 'react';
import { findIndexRevokeList } from '../../utils';
import i18n from '@/i18n';
import { FailedCode, sendTransaction } from '@/ui/utils/sendTransaction';
import { useGasAccountSign } from '@/ui/views/GasAccount/hooks';
import { isHardwareRecoveryError } from '@/ui/utils/hardwareRecovery';
export { FailedCode } from '@/ui/utils/sendTransaction';

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
        gasCost: {
          gasCostUsd: BigNumber;
          gasCostAmount: BigNumber;
          nativeTokenSymbol: string;
        };
      };
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
  const account = useCurrentAccount();
  const gasAccount = useGasAccountSign();
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
  const generationRef = React.useRef(0);
  const [hardwareError, setHardwareError] = React.useState<string>();

  const addRevokeTask = React.useCallback(
    async (
      item: AssetApprovalSpender,
      priority: number = 0,
      ignoreGasCheck = false
    ) => {
      const generation = generationRef.current;
      const isCurrent = () => generation === generationRef.current;
      return queueRef.current.add(
        async (): Promise<void> => {
          if (!isCurrent()) return;
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
            if (!isCurrent()) return;
            const result = await sendTransaction({
              tx,
              ignoreGasCheck,
              wallet,
              chainServerId: revokeItem.chainServerId,
              sig: gasAccount?.sig,
              autoUseGasAccount: true,
              onProgress: (status) => {
                if (!isCurrent()) return;
                if (status === 'builded') {
                  setTxStatus('sended');
                } else if (status === 'signed') {
                  setTxStatus('signed');
                }
              },
              onUseGasAccount: () => {
                if (!isCurrent()) return;
                // update status
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
            // update status
            cloneItem.$status = {
              status: 'success',
              txHash: result.txHash,
              gasCost: result.gasCost,
            };
          } catch (e) {
            if (!isCurrent()) return;
            if (isHardwareRecoveryError(account?.type, e?.message || '')) {
              queueRef.current.pause();
              setStatus('paused');
              setHardwareError(e.message);
              void addRevokeTask(item, 1, ignoreGasCheck);
            }
            let failedCode = FailedCode.DefaultFailed;
            if (FailedCode[e.name]) {
              failedCode = e.name;
            }

            console.error(e);
            cloneItem.$status = {
              status: 'fail',
              failedCode: failedCode,
              failedReason: e.message,
              gasCost: e.gasCost,
            };
          } finally {
            if (isCurrent()) {
              setList((prev) => updateAssetApprovalSpender(prev, cloneItem));
              setTxStatus('idle');
            }
          }
        },
        { priority }
      );
    },
    [revokeList, account?.type, gasAccount?.sig, wallet]
  );

  const start = React.useCallback(() => {
    setHardwareError(undefined);
    setStatus('active');
    for (const item of list) {
      addRevokeTask(item);
    }
  }, [addRevokeTask, list]);

  const init = React.useCallback(
    (
      dataSource: AssetApprovalSpender[],
      revokeList: ApprovalSpenderItemToBeRevoked[]
    ) => {
      queueRef.current.clear();
      generationRef.current += 1;
      setHardwareError(undefined);
      queueRef.current.start();
      setList(dataSource);
      setRevokeList(revokeList);
      setTxStatus('idle');
      setStatus('idle');
    },
    []
  );

  const pause = React.useCallback(() => {
    queueRef.current.pause();
    setStatus('paused');
  }, []);

  const handleContinue = React.useCallback(() => {
    setHardwareError(undefined);
    queueRef.current.start();
    setStatus('active');
  }, []);

  React.useEffect(() => {
    queueRef.current.on('error', (error) => {
      console.error('Queue error:', error);
    });

    queueRef.current.on('idle', () => {
      setStatus((current) => (current === 'idle' ? current : 'completed'));
    });

    return () => {
      queueRef.current.removeAllListeners();
      queueRef.current.clear();
      generationRef.current += 1;
    };
  }, []);

  const totalApprovals = React.useMemo(() => {
    return revokeList.length;
  }, [revokeList]);

  const revokedApprovals = React.useMemo(() => {
    return list.filter((item) => item.$status?.status === 'success').length;
  }, [list]);

  const currentApprovalIndex = React.useMemo(() => {
    return list.findIndex((item) => item.$status?.status === 'pending');
  }, [list]);

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
    hardwareError,
  };
};

export type BatchRevokeTaskType = ReturnType<typeof useBatchRevokeTask>;
