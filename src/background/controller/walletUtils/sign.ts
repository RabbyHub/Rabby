import { findChain } from '@/utils/chain';
import { isTempoChain } from '@/utils/tempo';
import { Tx } from 'background/service/openapi';
import BigNumber from 'bignumber.js';
import providerController from '../provider/controller';
import {
  openapiService,
  transactionHistoryService,
} from '@/background/service';
import { t } from 'i18next';
import { INTERNAL_REQUEST_SESSION } from '@/constant';
import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { Abis as TempoAbis, Addresses as TempoAddresses } from 'viem/tempo';

export const getRecommendGas = async ({
  gas,
  tx,
  gasUsed,
  preparedHistoryGasUsed,
}: {
  gasUsed: number;
  gas: number;
  tx: Tx;
  chainId: number;
  preparedHistoryGasUsed?:
    | ReturnType<typeof openapiService.historyGasUsed>
    | Awaited<ReturnType<typeof openapiService.historyGasUsed>>;
}) => {
  if (gas > 0) {
    return {
      needRatio: true,
      gas: new BigNumber(gas),
      gasUsed,
    };
  }
  const txGas = tx.gasLimit || tx.gas;
  if (txGas && new BigNumber(txGas).gt(0)) {
    return {
      needRatio: true,
      gas: new BigNumber(txGas),
      gasUsed: Number(txGas),
    };
  }
  try {
    let res: Awaited<ReturnType<typeof openapiService.historyGasUsed>>;
    if (!preparedHistoryGasUsed) {
      res = await openapiService.historyGasUsed({
        tx: {
          ...tx,
          nonce: tx.nonce || '0x1', // set a mock nonce for explain if dapp not set it
          data: tx.data,
          value: tx.value || '0x0',
          gas: tx.gas || '', // set gas limit if dapp not set
        },
        user_addr: tx.from,
      });
    } else {
      res = await preparedHistoryGasUsed;
    }

    if (res.gas_used > 0) {
      return {
        needRatio: true,
        gas: new BigNumber(res.gas_used),
        gasUsed: res.gas_used,
      };
    }
  } catch (e) {
    // NOTHING
  }

  return {
    needRatio: false,
    gas: new BigNumber(1000000),
    gasUsed: 1000000,
  };
};

export const getRecommendNonce = async ({
  from,
  chainId,
  nonceKey,
}: {
  from: string;
  chainId: number;
  nonceKey?: string | number | bigint;
}) => {
  const chain = findChain({
    id: chainId,
  });
  if (!chain) {
    throw new Error(t('background.error.invalidChainId'));
  }
  const normalizedNonceKey = (() => {
    if (!isTempoChain(chain.serverId)) return undefined;
    if (typeof nonceKey === 'undefined' || nonceKey === null) return undefined;
    if (typeof nonceKey === 'bigint')
      return nonceKey > 0n ? nonceKey : undefined;
    if (typeof nonceKey === 'number') {
      if (!Number.isFinite(nonceKey) || nonceKey <= 0) return undefined;
      return BigInt(Math.trunc(nonceKey));
    }
    if (typeof nonceKey === 'string') {
      const trimmed = nonceKey.trim();
      if (!trimmed || trimmed === '0x' || trimmed === '0X') return undefined;
      const value = BigInt(trimmed);
      return value > 0n ? value : undefined;
    }
    return undefined;
  })();
  if (typeof normalizedNonceKey !== 'undefined') {
    const data = encodeFunctionData({
      abi: TempoAbis.nonce,
      functionName: 'getNonce',
      args: [from as `0x${string}`, normalizedNonceKey],
    });
    const result = await providerController.ethRpc(
      {
        data: {
          method: 'eth_call',
          params: [
            {
              to: TempoAddresses.nonceManager,
              data,
            },
            'latest',
          ],
        },
        session: INTERNAL_REQUEST_SESSION,
      },
      chain.serverId
    );
    const onChainNonce = decodeFunctionResult({
      abi: TempoAbis.nonce,
      functionName: 'getNonce',
      data: result as `0x${string}`,
    }) as bigint;
    return `0x${onChainNonce.toString(16)}`;
  }

  const onChainNonce = await providerController.ethRpc(
    {
      data: {
        method: 'eth_getTransactionCount',
        params: [from, 'latest'],
      },
      session: INTERNAL_REQUEST_SESSION,
    },
    chain.serverId
  );
  const localNonce =
    (await transactionHistoryService.getNonceByChain(from, chainId)) || 0;
  return `0x${BigNumber.max(onChainNonce, localNonce).toString(16)}`;
};
