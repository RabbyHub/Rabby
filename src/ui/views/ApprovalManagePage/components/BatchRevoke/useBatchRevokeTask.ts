import {
  CHAINS_ENUM,
  EVENTS,
  INTERNAL_REQUEST_ORIGIN,
  INTERNAL_REQUEST_SESSION,
} from '@/constant';
import { intToHex, useWallet, WalletControllerType } from '@/ui/utils';
import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
import { AssetApprovalSpender } from '@/utils/approval';
import { findChain } from '@/utils/chain';
import {
  calcGasLimit,
  calcMaxPriorityFee,
  checkGasAndNonce,
  explainGas,
  getNativeTokenBalance,
  getPendingTxs,
} from '@/utils/transaction';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import PQueue from 'p-queue';
import React from 'react';
import { findIndexRevokeList } from '../../utils';
import {
  fetchActionRequiredData,
  parseAction,
} from '@/ui/views/Approval/components/Actions/utils';
import eventBus from '@/eventBus';
import i18n from '@/i18n';
import Browser from 'webextension-polyfill';

async function buildTx(
  wallet: WalletControllerType,
  item: ApprovalSpenderItemToBeRevoked,
  ignoreGasCheck = false
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

  const chain = findChain({
    serverId: item.chainServerId,
  })!;
  const support1559 = chain.eip['1559'];
  const { address } = (await wallet.getCurrentAccount())!;
  const recommendNonce = await wallet.getRecommendNonce({
    from: tx.from,
    chainId: chain.id,
  });

  // get gas
  const gasMarket = await wallet.openapi.gasMarket(item.chainServerId);
  const normalGas = gasMarket.find((item) => item.level === 'normal')!;
  const signingTxId = await wallet.addSigningTx(tx);

  // pre exec tx
  const preExecResult = await wallet.openapi.preExecTx({
    tx: {
      ...tx,
      nonce: recommendNonce,
      data: tx.data,
      value: tx.value || '0x0',
      gasPrice: intToHex(Math.round(normalGas.price)),
    },
    origin: INTERNAL_REQUEST_ORIGIN,
    address: address,
    updateNonce: true,
    pending_tx_list: await getPendingTxs({
      recommendNonce,
      wallet,
      address,
    }),
  });

  const balance = await getNativeTokenBalance({
    wallet,
    chainId: chain.id,
    address,
  });
  let estimateGas = 0;
  if (preExecResult.gas.success) {
    estimateGas = preExecResult.gas.gas_limit || preExecResult.gas.gas_used;
  }
  const { gas: gasRaw, needRatio, gasUsed } = await wallet.getRecommendGas({
    gasUsed: preExecResult.gas.gas_used,
    gas: estimateGas,
    tx,
    chainId: chain.id,
  });
  const gas = new BigNumber(gasRaw);
  const { gasLimit, recommendGasLimitRatio } = await calcGasLimit({
    chain,
    tx,
    gas,
    selectedGas: normalGas,
    nativeTokenBalance: balance,
    explainTx: preExecResult,
    needRatio,
    wallet,
  });

  // calc gasCost
  const gasCost = await explainGas({
    gasUsed,
    gasPrice: normalGas.price,
    chainId: chain.id,
    nativeTokenPrice: preExecResult.native_token.price,
    wallet,
    tx,
    gasLimit,
  });

  // check gas errors
  const checkErrors = checkGasAndNonce({
    recommendGasLimit: `0x${gas.toString(16)}`,
    recommendNonce,
    gasLimit: Number(gasLimit),
    nonce: Number(recommendNonce || tx.nonce),
    gasExplainResponse: gasCost,
    isSpeedUp: false,
    isCancel: false,
    tx,
    isGnosisAccount: false,
    nativeTokenBalance: balance,
    recommendGasLimitRatio,
  });

  const isGasNotEnough = checkErrors.some((e) => e.code === 3001);
  const ETH_GAS_USD_LIMIT = process.env.DEBUG
    ? (await Browser.storage.local.get('DEBUG_ETH_GAS_USD_LIMIT'))
        .DEBUG_ETH_GAS_USD_LIMIT || 20
    : 20;
  const OTHER_CHAIN_GAS_USD_LIMIT = process.env.DEBUG
    ? (await Browser.storage.local.get('DEBUG_OTHER_CHAIN_GAS_USD_LIMIT'))
        .DEBUG_OTHER_CHAIN_GAS_USD_LIMIT || 5
    : 5;
  let failedCode = 0;
  if (isGasNotEnough) {
    failedCode = FailedCode.GasNotEnough;
  } else if (
    !ignoreGasCheck &&
    // eth gas > $20
    ((chain.enum === CHAINS_ENUM.ETH &&
      gasCost.gasCostUsd.isGreaterThan(ETH_GAS_USD_LIMIT)) ||
      // other chain gas > $5
      (chain.enum !== CHAINS_ENUM.ETH &&
        gasCost.gasCostUsd.isGreaterThan(OTHER_CHAIN_GAS_USD_LIMIT)))
  ) {
    failedCode = FailedCode.GasTooHigh;
  }

  // generate tx with gas
  const transaction: Tx = {
    from: tx.from,
    to: tx.to,
    data: tx.data,
    nonce: recommendNonce,
    value: tx.value,
    chainId: tx.chainId,
    gas: gasLimit,
  };
  const maxPriorityFee = calcMaxPriorityFee([], normalGas, chain.id, true);
  const maxFeePerGas = intToHex(Math.round(normalGas.price));

  if (support1559) {
    transaction.maxFeePerGas = maxFeePerGas;
    transaction.maxPriorityFeePerGas =
      maxPriorityFee <= 0
        ? tx.maxFeePerGas
        : intToHex(Math.round(maxPriorityFee));
  } else {
    (transaction as Tx).gasPrice = maxFeePerGas;
  }

  // fetch action data
  const actionData = await wallet.openapi.parseTx({
    chainId: chain.serverId,
    tx: {
      ...tx,
      gas: '0x0',
      nonce: recommendNonce || '0x1',
      value: tx.value || '0x0',
      to: tx.to || '',
    },
    origin: origin || '',
    addr: address,
  });
  const parsed = parseAction(
    actionData.action,
    preExecResult.balance_change,
    {
      ...tx,
      gas: '0x0',
      nonce: recommendNonce || '0x1',
      value: tx.value || '0x0',
    },
    preExecResult.pre_exec_version,
    preExecResult.gas.gas_used
  );
  const requiredData = await fetchActionRequiredData({
    actionData: parsed,
    contractCall: actionData.contract_call,
    chainId: chain.serverId,
    address,
    wallet,
    tx: {
      ...tx,
      gas: '0x0',
      nonce: recommendNonce || '0x1',
      value: tx.value || '0x0',
    },
    origin,
  });

  await wallet.updateSigningTx(signingTxId, {
    rawTx: {
      nonce: recommendNonce,
    },
    explain: {
      ...preExecResult,
    },
    action: {
      actionData: parsed,
      requiredData,
    },
  });

  return {
    transaction,
    signingTxId,
    logId: actionData.log_id,
    failedCode,
    estimateGasCost: {
      gasCostUsd: gasCost.gasCostUsd,
      gasCostAmount: gasCost.gasCostAmount,
      nativeTokenSymbol: preExecResult.native_token.symbol,
      gasPrice: normalGas.price,
      nativeTokenPrice: preExecResult.native_token.price,
    },
  };
}

// fail code
export enum FailedCode {
  GasNotEnough = 1,
  GasTooHigh = 2,
  SubmitTxFailed = 3,
  DefaultFailed = 4,
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
};

export type AssetApprovalSpenderWithStatus = AssetApprovalSpender & {
  $status?:
    | {
        status: 'pending';
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
      data.$assetParent?.id === item.$assetParent?.id
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

  const addRevokeTask = React.useCallback(
    async (
      item: AssetApprovalSpender,
      priority: number = 0,
      ignoreGasCheck = false
    ) => {
      return queueRef.current.add(
        async () => {
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
            // build tx
            const {
              transaction,
              signingTxId,
              logId,
              estimateGasCost,
              failedCode,
            } = await buildTx(wallet, revokeItem, ignoreGasCheck);

            if (failedCode) {
              cloneItem.$status = {
                status: 'fail',
                failedCode,
                gasCost: estimateGasCost,
              };
              return;
            }

            if (process.env.DEBUG) {
              const { DEBUG_MOCK_SUBMIT } = await Browser.storage.local.get(
                'DEBUG_MOCK_SUBMIT'
              );

              if (DEBUG_MOCK_SUBMIT) {
                cloneItem.$status = {
                  status: 'success',
                  txHash: 'mock_hash',
                  gasCost: estimateGasCost,
                };
                return;
              }
            }

            // submit tx
            let hash = '';
            try {
              hash = await Promise.race([
                wallet.ethSendTransaction({
                  data: {
                    $ctx: {},
                    params: [transaction],
                  },
                  session: INTERNAL_REQUEST_SESSION,
                  approvalRes: {
                    ...transaction,
                    signingTxId,
                    logId: logId,
                  },
                  pushed: false,
                  result: undefined,
                }),
                new Promise((_, reject) => {
                  eventBus.once(EVENTS.LEDGER.REJECTED, async (data) => {
                    reject(new Error(data));
                  });
                }),
              ]);
            } catch (e) {
              const err = new Error(e.message);
              err.name = 'SubmitTxFailed';
              throw err;
            }

            // wait tx completed
            const { gasUsed } = await new Promise<{ gasUsed: number }>(
              (resolve) => {
                const handler = (res) => {
                  if (res?.hash === hash) {
                    eventBus.removeEventListener(EVENTS.TX_COMPLETED, handler);
                    resolve(res || {});
                  }
                };
                eventBus.addEventListener(EVENTS.TX_COMPLETED, handler);
              }
            );

            // calc gas cost
            const gasCostAmount = new BigNumber(gasUsed)
              .times(estimateGasCost.gasPrice)
              .div(1e18);
            const gasCostUsd = new BigNumber(gasCostAmount).times(
              estimateGasCost.nativeTokenPrice
            );

            // update status
            cloneItem.$status = {
              status: 'success',
              txHash: hash,
              gasCost: {
                ...estimateGasCost,
                gasCostUsd,
                gasCostAmount,
              },
            };
          } catch (e) {
            let failedCode = FailedCode.DefaultFailed;
            if (e.name === 'SubmitTxFailed') {
              failedCode = FailedCode.SubmitTxFailed;
            }

            console.error(e);
            cloneItem.$status = {
              status: 'fail',
              failedCode: failedCode,
              failedReason: e.message,
            };
          } finally {
            setList((prev) => updateAssetApprovalSpender(prev, cloneItem));
          }
        },
        { priority }
      );
    },
    [revokeList]
  );

  const start = React.useCallback(() => {
    setStatus('active');
    for (const item of list) {
      addRevokeTask(item);
    }
  }, [list, revokeList]);

  const init = React.useCallback(
    (
      dataSource: AssetApprovalSpender[],
      revokeList: ApprovalSpenderItemToBeRevoked[]
    ) => {
      queueRef.current.clear();
      setList(dataSource);
      setRevokeList(revokeList);
      setStatus('idle');
    },
    []
  );

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

  return {
    list,
    init,
    start,
    continue: handleContinue,
    pause,
    status,
    addRevokeTask,
  };
};

export type BatchRevokeTaskType = ReturnType<typeof useBatchRevokeTask>;
