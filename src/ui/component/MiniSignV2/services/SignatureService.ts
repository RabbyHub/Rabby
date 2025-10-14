import type { Tx, GasLevel } from '@rabby-wallet/rabby-api/dist/types';

import type { WalletControllerType } from '@/ui/utils';
import type {
  CalcItem,
  GasSelectionOptions,
  SignerConfig,
} from '@/ui/component/MiniSignV2/domain/types';
import type { SignerCtx } from '@/ui/component/MiniSignV2/domain/ctx';

import { SignatureSteps } from './SignatureSteps';
import { buildFingerprint } from '@/ui/component/MiniSignV2/domain/ctx';
import { findChain } from '@/utils/chain';
import { Account } from '@/background/service/preference';
import { explainGas } from '@/utils/transaction';
import BigNumber from 'bignumber.js';

type PrepareParams = {
  wallet: WalletControllerType;
  txs: Tx[];
  config: SignerConfig;
  enableSecurityEngine?: boolean;
  gasSelection?: GasSelectionOptions;
};

type OpenParams = PrepareParams & {
  prepared?: SignerCtx | Promise<SignerCtx>;
};

type GasParams = {
  wallet: WalletControllerType;
  ctx: SignerCtx;
  gas: GasLevel;
  account: SignerConfig['account'];
};

type SendParams = {
  wallet: WalletControllerType;
  ctx: SignerCtx;
  config: SignerConfig;
  retry?: boolean;
  onProgress?: (ctx: SignerCtx) => void;
};

export const signatureService = {
  fingerprint: (txs: Tx[]) => buildFingerprint(txs),

  prepare: async ({
    wallet,
    txs,
    config,
    enableSecurityEngine,
    gasSelection,
  }: PrepareParams) =>
    SignatureSteps.prefetchCore({
      wallet,
      account: config.account,
      txs,
      enableSecurityEngine,
      gasSelection,
      config,
    }),

  openUI: async ({
    wallet,
    txs,
    config,
    enableSecurityEngine,
    gasSelection,
    prepared,
  }: OpenParams) =>
    SignatureSteps.openUICore({
      wallet,
      account: config.account,
      txs,
      enableSecurityEngine,
      gasSelection,
      existing: prepared,
      config,
    }),

  updateGas: async ({ wallet, ctx, gas, account }: GasParams) =>
    SignatureSteps.updateGasCore({
      wallet,
      ctx,
      gas,
      account,
    }),

  send: async ({ wallet, ctx, config, retry, onProgress }: SendParams) => {
    const chainMeta = findChain({ id: ctx.chainId });
    const chainServerId = chainMeta?.serverId || '';
    let currentCtx = ctx;
    return SignatureSteps.sendCore({
      wallet,
      chainServerId,
      ctx: currentCtx,
      config,
      retry,
      onSendedTx: ({ hash, idx }) => {
        if (!onProgress) return;
        const txsCalc = currentCtx.txsCalc.map((item, index) =>
          index === idx ? { ...item, hash } : item
        );
        const total = txsCalc.length;
        const signed = idx === total - 1;

        currentCtx = {
          ...currentCtx,
          txsCalc,
          signInfo: {
            currentTxIndex: Math.min(idx + (signed ? 0 : 1), total),
            totalTxs: total,
            status: signed ? 'signed' : 'signing',
          },
        } as SignerCtx;
        onProgress(currentCtx);
      },
    });
  },
  gasCalcMethod: async ({
    txsCalc,
    price,
    currentAccount,
    wallet,
  }: {
    txsCalc: CalcItem[];
    price: string | number;
    currentAccount: Account;
    wallet: WalletControllerType;
  }) => {
    const res = await Promise.all(
      txsCalc.map((item) =>
        explainGas({
          gasUsed: item.gasUsed,
          gasPrice: price,
          chainId: item.tx.chainId,
          nativeTokenPrice: item.preExecResult.native_token.price || 0,
          tx: item.tx,
          wallet,
          gasLimit: item.gasLimit,
          account: currentAccount!,
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
  },
};
