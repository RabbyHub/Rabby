import {
  CHAINS_ENUM,
  EVENTS,
  INTERNAL_REQUEST_ORIGIN,
  INTERNAL_REQUEST_SESSION,
} from '@/constant';
import { intToHex, WalletControllerType } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import {
  calcGasLimit,
  calcMaxPriorityFee,
  checkGasAndNonce,
  explainGas,
  getNativeTokenBalance,
  getPendingTxs,
} from '@/utils/transaction';
import { GasLevel, Tx, TxPushType } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import {
  fetchActionRequiredData,
  parseAction,
} from '@/ui/views/Approval/components/Actions/utils';
import Browser from 'webextension-polyfill';
import eventBus from '@/eventBus';

// fail code
export enum FailedCode {
  GasNotEnough = 'GasNotEnough',
  GasTooHigh = 'GasTooHigh',
  SubmitTxFailed = 'SubmitTxFailed',
  DefaultFailed = 'DefaultFailed',
}

type ProgressStatus = 'building' | 'builded' | 'signed' | 'submitted';

/**
 * send transaction without rpcFlow
 * @param tx
 * @param chainServerId
 * @param wallet
 * @param ignoreGasCheck if ignore gas check
 * @param onProgress callback
 * @param gasLevel gas level, default is normal
 * @param lowGasDeadline low gas deadline
 * @param isGasLess is gas less
 */
export const sendTransaction = async ({
  tx,
  chainServerId,
  wallet,
  ignoreGasCheck,
  onProgress,
  gasLevel,
  lowGasDeadline,
  isGasLess,
  waitCompleted = true,
  pushType = 'default',
}: {
  tx: Tx;
  chainServerId: string;
  wallet: WalletControllerType;
  ignoreGasCheck?: boolean;
  onProgress?: (status: ProgressStatus) => void;
  gasLevel?: GasLevel;
  lowGasDeadline?: number;
  isGasLess?: boolean;
  waitCompleted?: boolean;
  pushType?: TxPushType;
}) => {
  onProgress?.('building');
  const chain = findChain({
    serverId: chainServerId,
  })!;
  const support1559 = chain.eip['1559'];
  const { address } = (await wallet.getCurrentAccount())!;
  const recommendNonce = await wallet.getRecommendNonce({
    from: tx.from,
    chainId: chain.id,
  });

  // get gas
  let normalGas = gasLevel;
  if (!normalGas) {
    const gasMarket = await wallet.openapi.gasMarket(chainServerId);
    normalGas = gasMarket.find((item) => item.level === 'normal')!;
  }

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
  let gasLimit = tx.gas || tx.gasLimit;
  let recommendGasLimitRatio = 1;

  if (!gasLimit) {
    const {
      gasLimit: _gasLimit,
      recommendGasLimitRatio: _recommendGasLimitRatio,
    } = await calcGasLimit({
      chain,
      tx,
      gas,
      selectedGas: normalGas,
      nativeTokenBalance: balance,
      explainTx: preExecResult,
      needRatio,
      wallet,
    });
    gasLimit = _gasLimit;
    recommendGasLimitRatio = _recommendGasLimitRatio;
  }

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
  let failedCode;
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

  if (failedCode) {
    throw {
      name: failedCode,
      gasCost,
    };
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
  const logId = actionData.log_id;
  const estimateGasCost = {
    gasCostUsd: gasCost.gasCostUsd,
    gasCostAmount: gasCost.gasCostAmount,
    nativeTokenSymbol: preExecResult.native_token.symbol,
    gasPrice: normalGas.price,
    nativeTokenPrice: preExecResult.native_token.price,
  };

  onProgress?.('builded');

  if (process.env.DEBUG) {
    const { DEBUG_MOCK_SUBMIT } = await Browser.storage.local.get(
      'DEBUG_MOCK_SUBMIT'
    );

    if (DEBUG_MOCK_SUBMIT) {
      return {
        txHash: 'mock_hash',
        gasCost: estimateGasCost,
      };
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
          lowGasDeadline,
          isGasLess,
          pushType,
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
    err.name = FailedCode.SubmitTxFailed;
    throw err;
  }

  onProgress?.('signed');

  if (waitCompleted) {
    // wait tx completed
    const txCompleted = await new Promise<{ gasUsed: number }>((resolve) => {
      const handler = (res) => {
        if (res?.hash === hash) {
          eventBus.removeEventListener(EVENTS.TX_COMPLETED, handler);
          resolve(res || {});
        }
      };
      eventBus.addEventListener(EVENTS.TX_COMPLETED, handler);
    });

    // calc gas cost
    const gasCostAmount = new BigNumber(txCompleted.gasUsed)
      .times(estimateGasCost.gasPrice)
      .div(1e18);
    const gasCostUsd = new BigNumber(gasCostAmount).times(
      estimateGasCost.nativeTokenPrice
    );

    return {
      txHash: hash,
      gasCost: {
        ...estimateGasCost,
        gasCostUsd,
        gasCostAmount,
      },
    };
  } else {
    return {
      txHash: hash,
      gasCost: {
        ...estimateGasCost,
      },
    };
  }
};
