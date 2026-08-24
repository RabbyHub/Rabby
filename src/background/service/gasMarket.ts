import { Chain } from '@debank/common';
import { CHAINS_ENUM } from 'consts';
import { getRecommendNonce } from '../controller/walletUtils/sign';
import openapiService from './openapi';
import type { Tx } from './openapi';

type GasMarketParams =
  | {
      chain: Chain;
      tx: Tx;
      customGas?: number;
      recommendNonce?: Promise<string>;
    }
  | {
      chainId: string;
      customGas?: number;
    };

export const gasMarketV2 = async (params: GasMarketParams) => {
  if (!('tx' in params)) {
    return openapiService.gasMarketV2({
      customGas: params.customGas,
      chainId: params.chainId,
    });
  }

  const { chain, tx: sourceTx } = params;
  let tx: Tx | undefined;

  // Linea's gas market needs a fully populated tx. Build a copy: the caller's
  // tx is shared with parse/pre-exec, so defaulting its fields in place would
  // change the transaction those requests describe.
  if (chain.enum === CHAINS_ENUM.LINEA) {
    tx = {
      chainId: sourceTx.chainId,
      data: sourceTx.data || '0x',
      from: sourceTx.from,
      gas: sourceTx.gas || '0x0',
      nonce:
        sourceTx.nonce ??
        (await (params.recommendNonce ||
          getRecommendNonce({ from: sourceTx.from, chainId: chain.id }))),
      to: sourceTx.to,
      value: sourceTx.value,
      gasPrice: sourceTx.gasPrice || '0x0',
    };
  }

  return openapiService.gasMarketV2({
    customGas: params.customGas,
    chainId: chain.serverId,
    tx,
  });
};
