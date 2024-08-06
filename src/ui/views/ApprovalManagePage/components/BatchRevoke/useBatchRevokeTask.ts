import { INTERNAL_REQUEST_ORIGIN, INTERNAL_REQUEST_SESSION } from '@/constant';
import { intToHex, useWallet, WalletControllerType } from '@/ui/utils';
import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
import { AssetApprovalSpender } from '@/utils/approval';
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
import { findIndexRevokeList } from '../../utils';
import {
  fetchActionRequiredData,
  parseAction,
} from '@/ui/views/Approval/components/Actions/utils';

async function buildTx(
  wallet: WalletControllerType,
  item: ApprovalSpenderItemToBeRevoked
) {
  let tx: Tx;
  // generate tx
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
      // todo
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
  };
}

export type AssetApprovalSpenderWithStatus = AssetApprovalSpender & {
  $status?: {
    status: 'pending' | 'success' | 'fail';
    txHash?: string;
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

  const start = React.useCallback(async () => {
    await Promise.all(
      list.map(async (item) =>
        queueRef.current.add(async () => {
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
          // TODO: maybe failed
          const { transaction, signingTxId, logId } = await buildTx(
            wallet,
            revokeItem
          );

          // to send
          await wallet.ethSendTransaction({
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
          });
          cloneItem.$status!.status = 'success';
          setList((prev) => updateAssetApprovalSpender(prev, cloneItem));

          // to update status

          console.log(transaction);
        })
      )
    );
  }, [list, revokeList]);

  const init = React.useCallback(
    (
      dataSource: AssetApprovalSpender[],
      revokeList: ApprovalSpenderItemToBeRevoked[]
    ) => {
      queueRef.current.clear();
      setList(dataSource);
      setRevokeList(revokeList);
    },
    []
  );

  React.useEffect(() => {
    queueRef.current.on('error', (error) => {
      console.error('Queue error:', error);
    });

    return () => {
      queueRef.current.clear();
    };
  }, []);

  return { init, start, list };
};
