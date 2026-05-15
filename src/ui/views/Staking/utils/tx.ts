import BigNumber from 'bignumber.js';
import { decodeFunctionResult, encodeFunctionData } from 'viem';
import type { Abi, Address, Hex } from 'viem';

import type {
  StakingApprovalRequest,
  StakingTxBuildResult,
  StakingTxRequest,
  Univ2ReadContractClient,
  Univ3ReadContractClient,
} from '@rabby-wallet/staking-sdk';
import type { Tx } from '@rabby-wallet/rabby-api/dist/types';

import { ETH_USDT_CONTRACT } from '@/constant';
import type { Account } from '@/background/service/preference';
import { isSameAddress } from '@/ui/utils';
import type { WalletControllerType } from '@/ui/utils/WalletContext';

type StakingWalletForTx = Pick<
  WalletControllerType,
  'approveToken' | 'getERC20Allowance' | 'requestETHRpc'
>;

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const createStakingReadContractClient = ({
  wallet,
  chainServerId,
  account,
}: {
  wallet: Pick<WalletControllerType, 'requestETHRpc'>;
  chainServerId: string;
  account?: Account;
}): Univ2ReadContractClient & Univ3ReadContractClient => ({
  readContract: (args) =>
    readStakingContract({
      wallet,
      chainServerId,
      account,
      ...args,
    }),
});

export const readStakingContract = async ({
  wallet,
  chainServerId,
  account,
  address,
  abi,
  functionName,
  args,
}: {
  wallet: Pick<WalletControllerType, 'requestETHRpc'>;
  chainServerId: string;
  account?: Account;
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}) => {
  const data = encodeFunctionData({
    abi,
    functionName,
    args,
  });
  const result = await wallet.requestETHRpc<string>(
    {
      method: 'eth_call',
      params: [
        {
          to: address,
          data,
        },
        'latest',
      ],
    },
    chainServerId,
    account
  );

  return decodeFunctionResult({
    abi,
    functionName,
    data: result as Hex,
  });
};

export const normalizeStakingSdkTx = (
  tx: StakingTxRequest,
  fallbackEvmChainId: number
): Tx =>
  ({
    from: tx.from,
    to: tx.to,
    data: tx.data,
    value: tx.value || '0x0',
    chainId: tx.chainId || fallbackEvmChainId,
    // MiniSign fills the recommended nonce. Empty string normalizes to "0x"
    // and causes preExec to reject the staking transaction payload.
  } as Tx);

export const collectStakingApprovals = (
  buildResult: StakingTxBuildResult
): StakingApprovalRequest[] => {
  const approvals = [
    buildResult.approval,
    ...(buildResult.approvals || []),
  ].filter(Boolean) as StakingApprovalRequest[];
  const merged = new Map<string, StakingApprovalRequest>();

  approvals.forEach((approval) => {
    const key = `${approval.token.toLowerCase()}-${approval.spender.toLowerCase()}`;
    const existing = merged.get(key);
    if (
      !existing ||
      new BigNumber(approval.rawAmount).gt(existing.rawAmount || '0')
    ) {
      merged.set(key, approval);
    }
  });

  return Array.from(merged.values());
};

const getApproveTx = async ({
  wallet,
  chainServerId,
  account,
  token,
  spender,
  rawAmount,
}: {
  wallet: Pick<WalletControllerType, 'approveToken'>;
  chainServerId: string;
  account: Account;
  token: Address;
  spender: Address;
  rawAmount: string | number;
}) => {
  const response = await wallet.approveToken(
    chainServerId,
    token,
    spender,
    rawAmount,
    undefined,
    undefined,
    undefined,
    true,
    account
  );
  const tx = (response as { params?: [Tx] })?.params?.[0];
  if (!tx) {
    throw new Error('Failed to build staking approval transaction');
  }
  return tx;
};

export const buildStakingApprovalTxs = async ({
  wallet,
  chainServerId,
  account,
  approvals,
}: {
  wallet: StakingWalletForTx;
  chainServerId: string;
  account: Account;
  approvals: StakingApprovalRequest[];
}) => {
  const txs: Tx[] = [];

  for (const approval of approvals) {
    const allowance = await wallet.getERC20Allowance(
      chainServerId,
      approval.token,
      approval.spender
    );
    const allowanceAmount = new BigNumber(allowance || '0');
    const requiredAmount = new BigNumber(approval.rawAmount);

    if (allowanceAmount.gte(requiredAmount)) {
      continue;
    }

    if (
      chainServerId === 'eth' &&
      allowanceAmount.gt(0) &&
      isSameAddress(approval.token, ETH_USDT_CONTRACT)
    ) {
      txs.push(
        await getApproveTx({
          wallet,
          chainServerId,
          account,
          token: approval.token,
          spender: approval.spender,
          rawAmount: 0,
        })
      );
    }

    txs.push(
      await getApproveTx({
        wallet,
        chainServerId,
        account,
        token: approval.token,
        spender: approval.spender,
        rawAmount: approval.rawAmount,
      })
    );
  }

  return txs;
};

export const buildStakingMiniSignTxs = async ({
  wallet,
  chainServerId,
  evmChainId,
  account,
  buildResult,
}: {
  wallet: StakingWalletForTx;
  chainServerId: string;
  evmChainId: number;
  account: Account;
  buildResult: StakingTxBuildResult;
}) => {
  const approveTxs = await buildStakingApprovalTxs({
    wallet,
    chainServerId,
    account,
    approvals: collectStakingApprovals(buildResult),
  });
  const mainTx = normalizeStakingSdkTx(buildResult.tx, evmChainId);

  return {
    approveTxs,
    mainTx,
    txs: [...approveTxs, mainTx],
  };
};

export interface StakingTxReceipt {
  transactionHash?: string;
  status?: string;
  [key: string]: unknown;
}

export const waitForStakingTxReceipt = async ({
  wallet,
  chainServerId,
  account,
  hash,
  attempts = 5,
  interval = 3000,
}: {
  wallet: Pick<WalletControllerType, 'requestETHRpc'>;
  chainServerId: string;
  account?: Account;
  hash?: string;
  attempts?: number;
  interval?: number;
}) => {
  if (!hash) {
    return null;
  }

  for (let index = 0; index < attempts; index += 1) {
    const receipt = await wallet
      .requestETHRpc<StakingTxReceipt | null>(
        {
          method: 'eth_getTransactionReceipt',
          params: [hash],
        },
        chainServerId,
        account
      )
      .catch(() => null);

    if (receipt) {
      return receipt;
    }

    if (index < attempts - 1) {
      await wait(interval);
    }
  }

  return null;
};

export const getStakingMainTxHash = (hashes: string[]) =>
  hashes.filter(Boolean).slice(-1)[0] || '';
