import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { intToHex, useWallet, WalletControllerType } from '@/ui/utils';
import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
import { findChain } from '@/utils/chain';
import {
  calcGasLimit,
  calcMaxPriorityFee,
  getNativeTokenBalance,
  getPendingTxs,
} from '@/utils/transaction';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import PQueue from 'p-queue';
import React from 'react';

async function buildTx(
  wallet: WalletControllerType,
  item: ApprovalSpenderItemToBeRevoked
) {
  let tx: Tx;
  if ('nftTokenId' in item) {
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

  const gasMarket = await wallet.openapi.gasMarket(item.chainServerId);
  const normalGas = gasMarket.find((item) => item.level === 'normal')!;

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
  const { gas: gasRaw, needRatio } = await wallet.getRecommendGas({
    gasUsed: preExecResult.gas.gas_used,
    gas: estimateGas,
    tx,
    chainId: chain.id,
  });
  const gas = new BigNumber(gasRaw);
  const { gasLimit } = await calcGasLimit({
    chain,
    tx,
    gas,
    selectedGas: normalGas,
    nativeTokenBalance: balance,
    explainTx: preExecResult,
    needRatio,
    wallet,
  });

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

  console.log('tx', transaction);
}

export const useBatchRevokeTask = () => {
  const wallet = useWallet();
  const queue = React.useMemo(
    () =>
      new PQueue({
        concurrency: 1,
        autoStart: true,
      }),
    []
  );

  const start = async (list: ApprovalSpenderItemToBeRevoked[]) => {
    await Promise.all(
      list.map(async (item) =>
        queue.add(async () => {
          const tx = await buildTx(wallet, item);
        })
      )
    );
  };

  return { start };
};
