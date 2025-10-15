import BigNumber from 'bignumber.js';
import { intToHex } from '@/ui/utils/number';
import { findChain, isTestnet } from '@/utils/chain';
import {
  calcGasLimit,
  calcMaxPriorityFee,
  checkGasAndNonce,
  convertLegacyTo1559,
  explainGas,
  getNativeTokenBalance,
  getPendingTxs,
} from '@/utils/transaction';

import {
  computeCustomGasPrice,
  selectInitialGas,
} from '@/ui/component/MiniSignV2/domain/gasSelection';
import { sendTransactionByMiniSignV2 as sendTransaction } from '@/ui/utils/sendTransaction';
import {
  parseAction,
  fetchActionRequiredData,
  formatSecurityEngineContext,
  ParsedTransactionActionData,
  ActionRequireData,
} from '@rabby-wallet/rabby-action';
import type { Result } from '@rabby-wallet/rabby-security-engine';
import { getTimeSpan } from '@/ui/utils/time';
import {
  ALIAS_ADDRESS,
  INTERNAL_REQUEST_ORIGIN,
  SUPPORT_1559_KEYRING_TYPE,
} from 'consts';
import { normalizeTxParams } from '@/ui/views/Approval/components/SignTx';
import { getCexInfo } from '@/ui/models/exchange';

import type { OpenApiService } from '@rabby-wallet/rabby-api';
import { buildFingerprint } from '@/ui/component/MiniSignV2/domain/ctx';
import type { SignerCtx } from '@/ui/component/MiniSignV2/domain/ctx';
import type { Account } from '@/background/service/preference';
import type {
  GasLevel,
  MultiAction,
  Tx,
} from '@rabby-wallet/rabby-api/dist/types';
import type { WalletControllerType } from '@/ui/utils';
import type {
  PreparedContext,
  CalcItem,
  RetryInfo,
  SendOptions,
  GasSelectionOptions,
  SecurityResult,
  SignerConfig,
} from '@/ui/component/MiniSignV2/domain/types';
import { isLedgerLockError } from '@/ui/utils/ledger';

async function recomputeExplainForCalcItems(params: {
  wallet: WalletControllerType;
  chainId: number;
  is1559Capable: boolean;
  gasList: GasLevel[];
  txsCalc: CalcItem[];
  newGas: GasLevel;
  account: Account;
}): Promise<CalcItem[]> {
  const {
    wallet,
    chainId,
    is1559Capable,
    gasList,
    txsCalc,
    newGas,
    account,
  } = params;
  const chain = findChain({ id: chainId })!;
  const maxPriorityFee = calcMaxPriorityFee(
    gasList as any,
    newGas as any,
    chain.id,
    true
  );
  const nextCalc: CalcItem[] = await Promise.all(
    txsCalc.map(async (item) => {
      const newTx = { ...item.tx } as any;
      if (is1559Capable) {
        newTx.maxFeePerGas = intToHex(Math.round(newGas.price));
        newTx.maxPriorityFeePerGas =
          maxPriorityFee <= 0
            ? newTx.maxFeePerGas
            : intToHex(Math.round(maxPriorityFee));
        delete newTx.gasPrice;
      } else {
        newTx.gasPrice = intToHex(Math.round(newGas.price));
        delete newTx.maxFeePerGas;
        delete newTx.maxPriorityFeePerGas;
      }
      const gasCost = await explainGas({
        gasUsed: item.gasUsed || 0,
        gasPrice: newGas.price,
        chainId: chain.id,
        nativeTokenPrice: item.preExecResult?.native_token?.price || 0,
        wallet,
        tx: newTx,
        gasLimit: item.gasLimit,
        account,
      });
      return { ...item, tx: newTx, gasCost } as CalcItem;
    })
  );
  return nextCalc;
}

async function computeGasless(params: {
  wallet: WalletControllerType;
  txsCalc: CalcItem[];
  gasPriceWei: number;
}): Promise<ReturnType<OpenApiService['gasLessTxsCheck']>> {
  const { wallet, txsCalc, gasPriceWei } = params;
  try {
    const res = await wallet.openapi.gasLessTxsCheck({
      tx_list: txsCalc.map((i) => ({
        ...i.tx,
        gas: i.gasLimit,
        gasPrice: intToHex(Math.round(gasPriceWei)),
      })),
    });
    return res;
  } catch {
    return { is_gasless: false };
  }
}

async function computeGasAccount(params: {
  wallet: WalletControllerType;
  txsCalc: CalcItem[];
}): Promise<PreparedContext['gasAccount'] | undefined> {
  const { wallet, txsCalc } = params;
  try {
    const sig = await wallet.getGasAccountSig();
    const res = await wallet.openapi.checkGasAccountTxs({
      sig: sig.sig || '',
      account_id: sig.accountId || txsCalc[0].tx.from,
      tx_list: txsCalc.map((i) => i.tx),
    });
    return res as any;
  } catch (e) {
    console.log('error', e);
    return undefined;
  }
}

function aggregateCheckErrors(params: {
  txsCalc: CalcItem[];
  nativeTokenBalance?: string;
}): PreparedContext['checkErrors'] {
  const { txsCalc, nativeTokenBalance } = params;
  let checkErrors: PreparedContext['checkErrors'] = [];
  if (!txsCalc.length) return checkErrors;
  let balanceLeft = nativeTokenBalance || '0';
  for (const item of txsCalc) {
    const errs = checkGasAndNonce({
      recommendGasLimitRatio: item.recommendGasLimitRatio,
      recommendGasLimit: item.gasLimit,
      recommendNonce: item.tx.nonce!,
      tx: item.tx,
      gasLimit: item.gasLimit,
      nonce: item.tx.nonce!,
      isCancel: false,
      gasExplainResponse: item.gasCost,
      isSpeedUp: false,
      isGnosisAccount: false,
      nativeTokenBalance: balanceLeft,
    });
    checkErrors = [...checkErrors, ...errs];
    balanceLeft = new BigNumber(balanceLeft)
      .minus(new BigNumber(item.tx.value || 0))
      .minus(new BigNumber(item.gasCost.maxGasCostAmount || 0))
      .toFixed();
  }
  return checkErrors;
}

let retryTxs = [] as Tx[];

export class SignatureSteps {
  static async getSecurityEngineResults(params: {
    wallet: WalletControllerType;
    account: Account;
    chainId: number;
    last: CalcItem;
  }): Promise<SecurityResult | undefined> {
    const { wallet, account, chainId, last } = params;
    const chain = findChain({ id: chainId })!;
    try {
      const actionResp = await wallet.openapi.parseTx({
        chainId: chain.serverId,
        tx: {
          ...last.tx,
          gas: '0x0',
          nonce: last.tx.nonce || '0x1',
          value: last.tx.value || '0x0',
        } as any,
        origin: INTERNAL_REQUEST_ORIGIN,
        addr: account.address,
      });

      let parsedTransactionActionData: ParsedTransactionActionData;
      let actionRequireData: ActionRequireData;
      let parsedTransactionActionDataList:
        | ParsedTransactionActionData[]
        | undefined = undefined;
      let actionRequireDataList: ActionRequireData[] | undefined = undefined;
      let engineResultList: Result[][] | undefined = undefined;
      let engineResult: Result[] = [];

      if (actionResp.action.type === 'multi_actions') {
        const actions = actionResp.action.data as MultiAction;
        const tx = last.tx;
        const res = last.preExecResult;
        parsedTransactionActionDataList = actions.map((action) =>
          parseAction({
            type: 'transaction',
            data: action,
            balanceChange: res.balance_change,
            tx: {
              ...tx,
              gas: '0x0',
              nonce: tx.nonce || '0x1',
              value: tx.value || '0x0',
            },
            preExecVersion: res.pre_exec_version,
            gasUsed: res.gas.gas_used,
            sender: tx.from,
          })
        );
        actionRequireDataList = await Promise.all(
          parsedTransactionActionDataList.map(async (item) => {
            const cexInfo = await getCexInfo(item.send?.to || '', wallet);
            return fetchActionRequiredData({
              type: 'transaction',
              actionData: item,
              contractCall: actionResp.contract_call,
              chainId: chain.serverId,
              sender: account.address,
              walletProvider: {
                findChain,
                ALIAS_ADDRESS,
                hasPrivateKeyInWallet: wallet.hasPrivateKeyInWallet,
                hasAddress: wallet.hasAddress,
                getWhitelist: wallet.getWhitelist,
                isWhitelistEnabled: wallet.isWhitelistEnabled,
                getPendingTxsByNonce: wallet.getPendingTxsByNonce,
              },
              cex: cexInfo,
              tx: {
                ...tx,
                gas: '0x0',
                nonce: tx.nonce || '0x1',
                value: tx.value || '0x0',
              },
              apiProvider: isTestnet(chain.serverId)
                ? wallet.testnetOpenapi
                : wallet.openapi,
            });
          })
        );
        const ctxList = await Promise.all(
          actionRequireDataList.map((requireData, index) => {
            return formatSecurityEngineContext({
              type: 'transaction',
              actionData: parsedTransactionActionDataList![index],
              requireData,
              chainId: chain.serverId,
              isTestnet: isTestnet(chain.serverId),
              provider: {
                getTimeSpan,
                hasAddress: wallet.hasAddress,
              },
            });
          })
        );
        engineResultList = await Promise.all(
          ctxList.map((ctx) => wallet.executeSecurityEngine(ctx))
        );
        parsedTransactionActionData = parsedTransactionActionDataList[0];
        actionRequireData = actionRequireDataList[0];
      } else {
        parsedTransactionActionData = parseAction({
          type: 'transaction',
          data: actionResp.action,
          balanceChange: last.preExecResult.balance_change,
          tx: { ...last.tx, gas: '0x0' },
          preExecVersion: last.preExecResult.pre_exec_version,
          gasUsed: last.preExecResult.gas.gas_used,
          sender: last.tx.from,
        });
        actionRequireData = await fetchActionRequiredData({
          type: 'transaction',
          actionData: parsedTransactionActionData,
          contractCall: actionResp.contract_call,
          chainId: chain.serverId,
          sender: account.address,
          walletProvider: {
            hasPrivateKeyInWallet: wallet.hasPrivateKeyInWallet,
            hasAddress: wallet.hasAddress,
            getWhitelist: wallet.getWhitelist,
            isWhitelistEnabled: wallet.isWhitelistEnabled,
            getPendingTxsByNonce: wallet.getPendingTxsByNonce,
            findChain,
            ALIAS_ADDRESS,
          },
          tx: { ...last.tx, gas: '0x0' },
          apiProvider: isTestnet(chain.serverId)
            ? wallet.testnetOpenapi
            : wallet.openapi,
        });
        const ctx = await formatSecurityEngineContext({
          type: 'transaction',
          actionData: parsedTransactionActionData,
          requireData: actionRequireData,
          chainId: chain.serverId,
          isTestnet: isTestnet(chain.serverId),
          provider: { getTimeSpan, hasAddress: wallet.hasAddress },
        });
        engineResult = await wallet.executeSecurityEngine(ctx);
      }
      return {
        parsedTransactionActionData,
        actionRequireData,
        engineResult,
        parsedTransactionActionDataList,
        actionRequireDataList,
        engineResultList,
      };
    } catch (e) {
      return undefined;
    }
  }

  static async prepareContext(params: {
    wallet: WalletControllerType;
    account: Account;
    txs: Tx[];
    enableSecurityEngine?: boolean;
    gasSelection?: GasSelectionOptions;
    config?: SignerConfig;
  }): Promise<PreparedContext> {
    const {
      wallet,
      account,
      txs,
      enableSecurityEngine,
      gasSelection,
      config,
    } = params;
    const chainId = txs[0].chainId;
    const chain = findChain({ id: chainId })!;
    const customGasPrice = computeCustomGasPrice({
      txs,
      flags: gasSelection?.flags,
      lastSelection: gasSelection?.lastSelection,
    });

    const [gasList, { median: gasPriceMedian }] = await Promise.all([
      wallet.gasMarketV2({
        chain,
        tx: txs[0],
        customGas: customGasPrice > 0 ? customGasPrice : undefined,
      }),
      wallet.openapi.gasPriceStats(chain.serverId),
    ]);
    const selectedGas = selectInitialGas({
      gasList,
      flags: gasSelection?.flags,
      lastSelection: gasSelection?.lastSelection,
      customGasPrice,
    });
    const nativeTokenBalance = await getNativeTokenBalance({
      wallet,
      chainId: chain.id,
      address: account.address,
    });

    const noCustomRPC = !(await wallet.hasCustomRPC(chain.enum));

    const txsCalc: CalcItem[] = [];
    let nativeTokenPrice: number | undefined = undefined;
    const is1559Capable = !!(
      chain.eip?.['1559'] &&
      (!account.type || SUPPORT_1559_KEYRING_TYPE.includes(account.type as any))
    );
    const maxPriorityFee = calcMaxPriorityFee(
      gasList as any,
      selectedGas as any,
      chain.id,
      false
    );
    // base nonce for the batch (align with MiniSignTx)
    const baseRecommendNonce = await wallet.getRecommendNonce({
      from: account.address,
      chainId: chain.id,
    });
    const tempTxs: Tx[] = [];
    for (let index = 0; index < txs.length; index++) {
      const rawTx = txs[index];
      const normalizedTx = normalizeTxParams(rawTx);
      let buildTx: Tx = {
        chainId,
        data: normalizedTx.data || '0x', // can not execute with empty string, use 0x instead
        from: normalizedTx.from,
        gas: normalizedTx.gas || rawTx.gasLimit,
        nonce:
          normalizedTx.nonce ||
          intToHex(new BigNumber(baseRecommendNonce).plus(index).toNumber()),
        to: normalizedTx.to,
        value: normalizedTx.value,
        gasPrice: intToHex(selectedGas.price),
      };

      if (is1559Capable) {
        buildTx = convertLegacyTo1559(buildTx) as any;
        (buildTx as any).maxPriorityFeePerGas =
          maxPriorityFee <= 0
            ? (buildTx as any).maxFeePerGas
            : intToHex(Math.round(maxPriorityFee));
      }
      // test error preExecTx
      // if (tempTxs.length) {
      //   throw new Error('test error preExecTx');
      // }

      tempTxs.push(buildTx);
      const preExecResult = await wallet.openapi.preExecTx({
        tx: buildTx,
        origin: INTERNAL_REQUEST_ORIGIN,
        address: account.address,
        updateNonce: true,
        pending_tx_list: [
          ...(await getPendingTxs({
            recommendNonce: baseRecommendNonce,
            wallet,
            address: account.address,
          })),
          ...tempTxs.slice(0, index),
        ],
      });

      let estimateGas = 0;
      if (preExecResult.gas.success) {
        estimateGas = preExecResult.gas.gas_limit || preExecResult.gas.gas_used;
      }

      const { gas: gasRaw, needRatio, gasUsed } = await wallet.getRecommendGas({
        gasUsed: preExecResult.gas.gas_used,
        gas: estimateGas,
        tx: buildTx,
        chainId: chain.id,
      });
      const gas = new BigNumber(gasRaw);

      let gasLimit = (buildTx as any).gas || (buildTx as any).gasLimit;
      let recommendGasLimitRatio = 1;
      if (!gasLimit) {
        const {
          gasLimit: _gl,
          recommendGasLimitRatio: _ratio,
        } = await calcGasLimit({
          chain,
          tx: buildTx,
          gas,
          selectedGas,
          nativeTokenBalance,
          explainTx: preExecResult,
          needRatio,
          wallet,
        });
        gasLimit = _gl;
        recommendGasLimitRatio = _ratio;
      }

      const gasCost = await explainGas({
        gasUsed,
        gasPrice: selectedGas.price,
        chainId: chain.id,
        nativeTokenPrice: preExecResult.native_token.price,
        wallet,
        tx: buildTx,
        gasLimit,
        account,
      });
      nativeTokenPrice = preExecResult.native_token.price;

      const finalTx = { ...buildTx, gas: gasLimit } as Tx;
      txsCalc.push({
        tx: finalTx,
        gasUsed,
        gasLimit: gasLimit!,
        recommendGasLimitRatio,
        gasCost,
        preExecResult,
      });

      if (index === txs.length - 1 && config?.onPreExecChange) {
        try {
          config.onPreExecChange(preExecResult);
        } catch (err) {
          console.error('onPreExecChange error', err);
        }
      }
    }

    // align with MiniSignTx: aggregate checkErrors across batch with running balance
    const checkErrors = aggregateCheckErrors({ txsCalc, nativeTokenBalance });
    const isGasNotEnough = !!checkErrors?.some((e) => e.code === 3001);
    // gasless + gasAccount in parallel
    const [gasless, gasAccount] = await Promise.all([
      computeGasless({ wallet, txsCalc, gasPriceWei: selectedGas.price }),
      computeGasAccount({ wallet, txsCalc }),
    ]);

    const selectedGasCost = await SignatureSteps.computeGasCost({
      wallet,
      account,
      chainId: chain.id,
      txsCalc,
      price: selectedGas.price,
    });

    // security engine (optional)
    let engineResults: SecurityResult | undefined;
    if (enableSecurityEngine && txsCalc.length) {
      const last = txsCalc[txsCalc.length - 1];
      engineResults = await SignatureSteps.getSecurityEngineResults({
        wallet,
        account,
        chainId: chain.id,
        last,
      });
    }

    return {
      chainId: chain.id,
      is1559: !!chain.eip?.['1559'],
      gasList,
      gasPriceMedian,
      selectedGas,
      selectedGasCost,
      txsCalc,
      nativeTokenPrice,
      nativeTokenBalance,
      checkErrors,
      gasless,
      gasAccount,
      engineResults,
      isGasNotEnough,
      noCustomRPC,
    };
  }

  static async refreshOnGasChange(params: {
    wallet: WalletControllerType;
    account: Account;
    chainId: number;
    is1559Capable: boolean;
    gasList: GasLevel[];
    txsCalc: CalcItem[];
    newGas: GasLevel;
    nativeTokenBalance?: string;
  }): Promise<
    Pick<
      PreparedContext,
      | 'txsCalc'
      | 'checkErrors'
      | 'gasless'
      | 'gasAccount'
      | 'gasList'
      | 'isGasNotEnough'
      | 'selectedGasCost'
    >
  > {
    const {
      wallet,
      account,
      chainId,
      is1559Capable,
      gasList,
      txsCalc,
      newGas,
      nativeTokenBalance,
    } = params;
    const chain = findChain({ id: chainId })!;
    const maxPriorityFee = calcMaxPriorityFee(
      gasList as any,
      newGas as any,
      chain.id,
      true
    );
    let newGasList = gasList;
    if (newGas.level === 'custom') {
      newGasList = (gasList || []).map((item) => {
        if (item.level === 'custom') return newGas;
        return item;
      });
    }

    const nextCalc: CalcItem[] = await recomputeExplainForCalcItems({
      wallet,
      chainId,
      is1559Capable,
      gasList,
      txsCalc,
      newGas,
      account,
    });

    const [gasless, gasAccount] = await Promise.all([
      computeGasless({ wallet, txsCalc: nextCalc, gasPriceWei: newGas.price }),
      computeGasAccount({ wallet, txsCalc: nextCalc }),
    ]);

    // lightweight re-validation: recompute gas warnings using cached balance
    const checkErrors = aggregateCheckErrors({
      txsCalc: nextCalc,
      nativeTokenBalance,
    });
    const isGasNotEnough = !!checkErrors?.some((e) => e.code === 3001);

    const selectedGasCost = await SignatureSteps.computeGasCost({
      wallet,
      account,
      chainId: chain.id,
      txsCalc: nextCalc,
      price: newGas.price,
    });

    return {
      txsCalc: nextCalc,
      checkErrors,
      gasless,
      gasAccount,
      gasList: newGasList,
      isGasNotEnough,
      selectedGasCost,
    };
  }

  static async computeGasCost(params: {
    wallet: WalletControllerType;
    account: Account;
    chainId: number;
    txsCalc: CalcItem[];
    price: string | number;
  }): Promise<{
    gasCostUsd: BigNumber;
    gasCostAmount: BigNumber;
    maxGasCostAmount: BigNumber;
  }> {
    const { wallet, account, chainId, txsCalc, price } = params;
    const res = await Promise.all(
      txsCalc.map((item) =>
        explainGas({
          gasUsed: item.gasUsed,
          gasPrice: price,
          chainId,
          nativeTokenPrice: item.preExecResult.native_token.price || 0,
          tx: item.tx,
          wallet,
          gasLimit: item.gasLimit,
          account: account,
        })
      )
    );
    const totalCost = res.reduce(
      (sum, item) => {
        sum.gasCostAmount = sum.gasCostAmount.plus(item.gasCostAmount);
        sum.gasCostUsd = sum.gasCostUsd.plus(item.gasCostUsd);

        sum.maxGasCostAmount = sum.maxGasCostAmount.plus(item.maxGasCostAmount);
        return sum;
      },
      {
        gasCostUsd: new BigNumber(0),
        gasCostAmount: new BigNumber(0),
        maxGasCostAmount: new BigNumber(0),
      }
    );
    return totalCost;
  }
  static async sendBatch(params: {
    wallet: WalletControllerType;
    chainServerId: string;
    txsCalc: CalcItem[];
    selectedGas: GasLevel | null;
    options: SendOptions;
    onSendedTx: (prams: { hash: string; idx: number }) => void;
    retry?: boolean;
  }): Promise<{ txHash: string }[] | { errorText?: string }> {
    const {
      wallet,
      chainServerId,
      txsCalc,
      options,
      onSendedTx,
      retry: isRetry,
    } = params;
    let i = 0;

    const {
      getRetryTxType,
      retryTxReset,
      getRetryTxRecommendNonce,
      setRetryTxRecommendNonce,
    } = wallet;

    if (!isRetry) {
      retryTxs = [];
      await retryTxReset();
    } else {
      if (!retryTxs.length) {
        retryTxs = txsCalc.map((e) => e.tx);
      }
    }

    try {
      const txHashes: { txHash: string }[] = [];
      for (; i < txsCalc.length; i++) {
        if (txsCalc[i].hash) {
          continue;
        }
        let tx = txsCalc[i].tx;
        if (isRetry) {
          tx = retryTxs[i];

          const retryType = await getRetryTxType();
          switch (retryType) {
            case 'nonce': {
              const recommendNonce = await getRetryTxRecommendNonce();
              tx.nonce = recommendNonce;
              break;
            }

            case 'gasPrice': {
              if (tx.gasPrice) {
                tx.gasPrice = `0x${new BigNumber(
                  new BigNumber(tx.gasPrice, 16).times(1.3).toFixed(0)
                ).toString(16)}`;
              }
              if (tx.maxFeePerGas) {
                tx.maxFeePerGas = `0x${new BigNumber(
                  new BigNumber(tx.maxFeePerGas, 16).times(1.3).toFixed(0)
                ).toString(16)}`;
              }
              break;
            }

            default:
              break;
          }
          const tmp = [...retryTxs];
          tmp[i] = { ...tx };
          retryTxs = tmp;
        }
        let sig: string | undefined;
        if (options?.isGasAccount) {
          sig = (await wallet.getGasAccountSig()).sig;
        }

        const result = await sendTransaction({
          tx,
          chainServerId,
          wallet,
          pushType: options?.pushType || 'default',
          isGasLess: !!options?.isGasLess,
          isGasAccount: !!options?.isGasAccount,
          ga: options?.ga,
          session: options?.session,
          sig,
          preExecResult: txsCalc[i]?.preExecResult,
        });
        onSendedTx?.({ hash: result.txHash, idx: i });
        txHashes.push({ ...result });
      }

      retryTxReset();
      return txHashes;
    } catch (e) {
      const msg = (e as any)?.message || (e as any)?.name || 'unknown error';
      retryTxReset();
      const tx = txsCalc?.[i]?.tx;
      if (
        !(
          isLedgerLockError(msg) ||
          msg === 'DISCONNECTED' ||
          msg === 'No OneKey Device found'
        )
      ) {
        try {
          await setRetryTxRecommendNonce({
            from: tx.from,
            chainId: tx.chainId,
            nonce: tx.nonce,
          });
        } catch (error) {
          console.error(
            'useBatchSignTxTask setRetryTxRecommendNonce error',
            error
          );
        }

        return { errorText: msg };
      }
      return { errorText: '' };
    }
  }

  static toCtxFromPrepared(params: {
    prepared: PreparedContext;
    txs: Tx[];
    open: boolean;
    switchGasAccount?: boolean;
  }): SignerCtx {
    const { prepared, txs, open, switchGasAccount } = params;
    return {
      fingerprint: buildFingerprint(txs),
      open,
      mode: 'ui',
      txs,
      gasMethod: switchGasAccount ? 'gasAccount' : 'native',
      useGasless: false,
      ...prepared,
    };
  }

  static async prefetchCore(params: {
    wallet: WalletControllerType;
    account: Account;
    txs: Tx[];
    enableSecurityEngine?: boolean;
    gasSelection?: GasSelectionOptions;
    autoSwitchGasAccount?: boolean;
    config: SignerConfig;
  }): Promise<SignerCtx> {
    const {
      wallet,
      account,
      txs,
      enableSecurityEngine,
      gasSelection,
      config,
      autoSwitchGasAccount = true,
    } = params;
    const prepared = await SignatureSteps.prepareContext({
      wallet,
      account,
      txs,
      enableSecurityEngine,
      gasSelection,
      config,
    });

    let switchGasAccount = false;
    if (autoSwitchGasAccount && prepared.txsCalc?.length) {
      const chain = findChain({
        id: prepared.txsCalc[0]?.tx.chainId,
      })!;
      const hasCustomRPC = await wallet.hasCustomRPC(chain?.enum);
      const gasAccountSupported =
        !!prepared.gasAccount?.balance_is_enough &&
        !prepared.gasAccount.chain_not_support &&
        !!prepared.gasAccount.is_gas_account &&
        !(prepared.gasAccount as any).err_msg;
      if (prepared.isGasNotEnough && !hasCustomRPC && gasAccountSupported) {
        switchGasAccount = true;
      }
    }

    return SignatureSteps.toCtxFromPrepared({
      prepared,
      txs,
      open: false,
      switchGasAccount,
    });
  }

  static async openUICore(params: {
    wallet: WalletControllerType;
    account: Account;
    txs: Tx[];
    enableSecurityEngine?: boolean;
    gasSelection?: GasSelectionOptions;
    existing?: SignerCtx | Promise<SignerCtx>;
    config: SignerConfig;
  }): Promise<SignerCtx> {
    const {
      wallet,
      account,
      txs,
      enableSecurityEngine,
      gasSelection,
      config,
      existing,
    } = params;
    const fp = buildFingerprint(txs);
    let ctx: SignerCtx;
    if (!existing || (await existing).fingerprint !== fp) {
      ctx = await SignatureSteps.prefetchCore({
        wallet,
        account,
        txs,
        enableSecurityEngine,
        gasSelection,
        config,
      });
    } else {
      ctx = await existing;
    }
    ctx = { ...ctx, open: true };
    if (enableSecurityEngine && !ctx.engineResults && ctx.txsCalc?.length) {
      try {
        const last = ctx.txsCalc[ctx.txsCalc.length - 1];
        const results = await SignatureSteps.getSecurityEngineResults({
          wallet,
          account,
          chainId: ctx.chainId,
          last: last as any,
        });
        ctx = { ...ctx, engineResults: results };
      } catch (err) {
        console.log('getSecurityEngineResults err', err);
      }
    }
    return ctx;
  }

  static async updateGasCore(params: {
    wallet: WalletControllerType;
    ctx: SignerCtx;
    gas: GasLevel;
    account: Account;
  }): Promise<SignerCtx> {
    const { wallet, ctx, gas, account } = params;
    const { txsCalc, gasList, chainId, is1559, nativeTokenBalance } = ctx;
    const updated = await SignatureSteps.refreshOnGasChange({
      wallet,
      account,
      chainId,
      is1559Capable: !!is1559,
      gasList,
      txsCalc: txsCalc as any,
      newGas: gas,
      nativeTokenBalance,
    });
    return {
      ...ctx,
      selectedGas: gas,
      ...updated,
    };
  }

  static async sendCore(params: {
    wallet: WalletControllerType;
    chainServerId: string;
    ctx: SignerCtx;
    config: SignerConfig;
    onSendedTx: (prams: { hash: string; idx: number }) => void;
    retry?: boolean;
  }): Promise<
    | {
        txHash: string;
      }[]
    | { errorText?: string }
  > {
    const { wallet, chainServerId, ctx, config, onSendedTx, retry } = params;
    const { txs, txsCalc, selectedGas, gasMethod, useGasless } = ctx;
    try {
      const res = await SignatureSteps.sendBatch({
        wallet,
        chainServerId,
        txsCalc: txsCalc,
        selectedGas: selectedGas!,
        options: {
          isGasLess: !!useGasless,
          isGasAccount: gasMethod === 'gasAccount',
          ga: config?.ga,
          session: config?.session,
          pushType: normalizeTxParams(txs[0])?.swapPreferMEVGuarded
            ? 'mev'
            : 'default',
        },
        onSendedTx,
        retry,
      });
      if ('errorText' in res)
        return {
          errorText: res.errorText,
        };
      return res;
    } catch (e) {
      return { errorText: (e as any)?.message || 'unknown error' };
    }
  }
}
