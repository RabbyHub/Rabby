import {
  ALIAS_ADDRESS,
  CHAINS_ENUM,
  EVENTS,
  INTERNAL_REQUEST_ORIGIN,
  INTERNAL_REQUEST_SESSION,
  KEYRING_TYPE,
  KEYRING_CATEGORY_MAP,
} from '@/constant';
import { intToHex, WalletControllerType } from '@/ui/utils';
import { findChain, isTestnet } from '@/utils/chain';
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
import Browser from 'webextension-polyfill';
import eventBus from '@/eventBus';
import {
  parseAction,
  fetchActionRequiredData,
} from '@rabby-wallet/rabby-action';
import stats from '@/stats';

// fail code
export enum FailedCode {
  GasNotEnough = 'GasNotEnough',
  GasTooHigh = 'GasTooHigh',
  SubmitTxFailed = 'SubmitTxFailed',
  DefaultFailed = 'DefaultFailed',
}

type ProgressStatus = 'building' | 'builded' | 'signed' | 'submitted';

const checkEnoughUseGasAccount = async ({
  gasAccount,
  wallet,
  transaction,
  currentAccountType,
}: {
  transaction: Tx;
  currentAccountType: string;
  wallet: WalletControllerType;
  gasAccount?: {
    sig: string | undefined;
    accountId: string | undefined;
  };
}) => {
  let gasAccountCanPay: boolean = false;

  // native gas not enough check gasAccount
  let gasAccountVerfiyPass = true;
  let gasAccountCost;
  try {
    gasAccountCost = await wallet.openapi.checkGasAccountTxs({
      sig: gasAccount?.sig || '',
      account_id: gasAccount?.accountId || '',
      tx_list: [transaction],
    });
  } catch (e) {
    gasAccountVerfiyPass = false;
  }
  gasAccountCanPay =
    gasAccountVerfiyPass &&
    currentAccountType !== KEYRING_TYPE.WalletConnectKeyring &&
    currentAccountType !== KEYRING_TYPE.WatchAddressKeyring &&
    !!gasAccountCost?.balance_is_enough &&
    !gasAccountCost.chain_not_support &&
    !!gasAccountCost.is_gas_account;

  return gasAccountCanPay;
};

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
 * @param isGasAccount is gas account
 * @param gasAccount gas account { sig, account }
 * @param autoUseGasAccount when gas balance is low , auto use gas account for gasfee
 * @param onUseGasAccount use gas account callback
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
  isGasAccount,
  gasAccount,
  autoUseGasAccount,
  waitCompleted = true,
  pushType = 'default',
  ignoreGasNotEnoughCheck,
  onUseGasAccount,
  ga,
}: {
  tx: Tx;
  chainServerId: string;
  wallet: WalletControllerType;
  ignoreGasCheck?: boolean;
  ignoreGasNotEnoughCheck?: boolean;
  onProgress?: (status: ProgressStatus) => void;
  onUseGasAccount?: () => void;
  gasLevel?: GasLevel;
  lowGasDeadline?: number;
  isGasLess?: boolean;
  isGasAccount?: boolean;
  gasAccount?: {
    sig: string | undefined;
    accountId: string | undefined;
  };
  autoUseGasAccount?: boolean;
  waitCompleted?: boolean;
  pushType?: TxPushType;
  ga?: Record<string, any>;
}) => {
  onProgress?.('building');
  const chain = findChain({
    serverId: chainServerId,
  })!;
  const support1559 = chain.eip['1559'];
  const { address, ...currentAccount } = (await wallet.getCurrentAccount())!;
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

  wallet.reportStats('createTransaction', {
    type: currentAccount.brandName,
    category: KEYRING_CATEGORY_MAP[currentAccount.type],
    chainId: chain.serverId,
    createdBy: ga ? 'rabby' : 'dapp',
    source: ga?.source || '',
    trigger: ga?.trigger || '',
    networkType: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
  });

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
  const checkErrors = ignoreGasNotEnoughCheck
    ? []
    : checkGasAndNonce({
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

  const isGasNotEnough = !isGasLess && checkErrors.some((e) => e.code === 3001);
  const ETH_GAS_USD_LIMIT = process.env.DEBUG
    ? (await Browser.storage.local.get('DEBUG_ETH_GAS_USD_LIMIT'))
        .DEBUG_ETH_GAS_USD_LIMIT || 20
    : 20;
  const OTHER_CHAIN_GAS_USD_LIMIT = process.env.DEBUG
    ? (await Browser.storage.local.get('DEBUG_OTHER_CHAIN_GAS_USD_LIMIT'))
        .DEBUG_OTHER_CHAIN_GAS_USD_LIMIT || 5
    : 5;

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

  let failedCode;
  let canUseGasAccount: boolean = false;
  if (isGasNotEnough) {
    //  native gas not enough check gasAccount
    if (autoUseGasAccount && gasAccount?.sig && gasAccount?.accountId) {
      const gasAccountCanPay = await checkEnoughUseGasAccount({
        gasAccount,
        currentAccountType: currentAccount.type,
        wallet,
        transaction: {
          ...transaction,
          gas: gasLimit,
          gasPrice: intToHex(normalGas.price),
        },
      });
      if (gasAccountCanPay) {
        onUseGasAccount?.();
        canUseGasAccount = true;
      } else {
        failedCode = FailedCode.GasNotEnough;
      }
    } else {
      failedCode = FailedCode.GasNotEnough;
    }
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
  const parsed = parseAction({
    type: 'transaction',
    data: actionData.action,
    balanceChange: preExecResult.balance_change,
    tx: {
      ...tx,
      gas: '0x0',
      nonce: recommendNonce || '0x1',
      value: tx.value || '0x0',
    },
    preExecVersion: preExecResult.pre_exec_version,
    gasUsed: preExecResult.gas.gas_used,
    sender: tx.from,
  });
  const requiredData = await fetchActionRequiredData({
    type: 'transaction',
    actionData: parsed,
    contractCall: actionData.contract_call,
    chainId: chain.serverId,
    sender: address,
    walletProvider: {
      hasPrivateKeyInWallet: wallet.hasPrivateKeyInWallet,
      hasAddress: wallet.hasAddress,
      getWhitelist: wallet.getWhitelist,
      isWhitelistEnabled: wallet.isWhitelistEnabled,
      getPendingTxsByNonce: wallet.getPendingTxsByNonce,
      findChain,
      ALIAS_ADDRESS,
    },
    tx: {
      ...tx,
      gas: '0x0',
      nonce: recommendNonce || '0x1',
      value: tx.value || '0x0',
    },
    apiProvider: isTestnet(chain.serverId)
      ? wallet.testnetOpenapi
      : wallet.openapi,
  });

  await wallet.updateSigningTx(signingTxId, {
    rawTx: {
      nonce: recommendNonce,
    },
    explain: {
      ...preExecResult,
      calcSuccess: !(checkErrors.length > 0),
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

  const handleSendAfter = async () => {
    const statsData = await wallet.getStatsData();

    if (statsData?.signed) {
      const sData: any = {
        type: statsData?.type,
        chainId: statsData?.chainId,
        category: statsData?.category,
        success: statsData?.signedSuccess,
        preExecSuccess: statsData?.preExecSuccess,
        createdBy: statsData?.createdBy,
        source: statsData?.source,
        trigger: statsData?.trigger,
        networkType: statsData?.networkType,
      };
      if (statsData.signMethod) {
        sData.signMethod = statsData.signMethod;
      }
      stats.report('signedTransaction', sData);
    }
    if (statsData?.submit) {
      stats.report('submitTransaction', {
        type: statsData?.type,
        chainId: statsData?.chainId,
        category: statsData?.category,
        success: statsData?.submitSuccess,
        preExecSuccess: statsData?.preExecSuccess,
        createdBy: statsData?.createdBy,
        source: statsData?.source,
        trigger: statsData?.trigger,
        networkType: statsData?.networkType || '',
      });
    }
  };

  // submit tx
  let hash = '';
  try {
    hash = await Promise.race([
      wallet.ethSendTransaction({
        data: {
          $ctx: {
            ga,
          },
          params: [transaction],
        },
        session: INTERNAL_REQUEST_SESSION,
        approvalRes: {
          ...transaction,
          signingTxId,
          logId: logId,
          lowGasDeadline,
          isGasLess,
          isGasAccount: autoUseGasAccount ? canUseGasAccount : isGasAccount,
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
    await handleSendAfter();
  } catch (e) {
    await handleSendAfter();
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
