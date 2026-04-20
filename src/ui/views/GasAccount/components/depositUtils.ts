import { CHAINS_ENUM } from '@/constant';
import { L2_DEPOSIT_ADDRESS_MAP } from '@/constant/gas-account';
import { isSameAddress } from '@/ui/utils';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { findChain, findChainByServerID } from '@/utils/chain';
import BigNumber from 'bignumber.js';
import { addHexPrefix, toChecksumAddress } from '@ethereumjs/util';
import { Account } from '@/background/service/preference';
import abiCoderInst, { AbiCoder } from 'web3-eth-abi';
import {
  GasAccountBridgeQuote,
  TokenItem,
  Tx,
} from '@rabby-wallet/rabby-api/dist/types';

const abiCoder = (abiCoderInst as unknown) as AbiCoder;

export const MIN_GAS_ACCOUNT_DEPOSIT_USD = 1;
export const MAX_GAS_ACCOUNT_DEPOSIT_USD = 500;

export const getGasAccountDirectDepositAddress = (chainServerId?: string) => {
  const chain = chainServerId ? findChain({ serverId: chainServerId }) : null;
  if (!chain) {
    return null;
  }

  return L2_DEPOSIT_ADDRESS_MAP[chain.enum as CHAINS_ENUM] || null;
};

export const getGasAccountDepositMode = (chainServerId?: string) => {
  return getGasAccountDirectDepositAddress(chainServerId) ? 'direct' : 'bridge';
};

export const buildTopUpGasAccount = async ({
  to,
  chainServerId,
  tokenId,
  rawAmount,
  account,
}: {
  to: string;
  chainServerId: string;
  tokenId: string;
  rawAmount: string;
  account: Account;
}): Promise<Tx> => {
  const chain = findChain({ serverId: chainServerId });
  if (!chain) {
    throw new Error('Invalid chain');
  }

  const isNativeToken = isSameAddress(tokenId, chain.nativeTokenAddress);

  if (isNativeToken) {
    return {
      chainId: chain.id,
      from: account.address,
      to,
      value: addHexPrefix(new BigNumber(rawAmount).toString(16)),
    } as Tx;
  }

  return {
    chainId: chain.id,
    from: account.address,
    to: tokenId,
    value: '0x0',
    data: abiCoder.encodeFunctionCall(
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          { type: 'address', name: 'to' },
          { type: 'uint256', name: 'value' },
        ],
      },
      [toChecksumAddress(to), rawAmount]
    ),
  } as Tx;
};

const getGasAccountBridgeRawAmount = ({
  token,
  usdValue,
}: {
  token: Pick<TokenItem, 'chain' | 'id' | 'decimals' | 'price'>;
  usdValue: number;
}) => {
  if (!token.price || !usdValue) {
    return '0';
  }

  return new BigNumber(usdValue)
    .div(token.price)
    .times(10 ** token.decimals)
    .decimalPlaces(0, BigNumber.ROUND_DOWN)
    .toFixed();
};

export const fetchGasAccountBridgeQuote = async ({
  wallet,
  token,
  account,
  usdValue,
}: {
  wallet: Pick<WalletControllerType, 'openapi'>;
  token: Pick<TokenItem, 'chain' | 'id' | 'decimals' | 'price'>;
  account: Account;
  usdValue: number;
}) => {
  return wallet.openapi.getGasAccountBridgeQuote({
    user_addr: account.address,
    from_chain_id: token.chain,
    from_token_id: token.id,
    from_token_raw_amount: getGasAccountBridgeRawAmount({
      token,
      usdValue,
    }),
  });
};

export const buildGasAccountBridgeTxs = async ({
  wallet,
  token,
  account,
  quote,
  usdValue,
}: {
  wallet: Pick<WalletControllerType, 'approveToken' | 'requestETHRpc'>;
  token: Pick<TokenItem, 'chain' | 'id' | 'decimals' | 'price'>;
  account: Account;
  quote: GasAccountBridgeQuote;
  usdValue: number;
}) => {
  const txs: Tx[] = [];
  const fromChain = findChain({ serverId: token.chain });
  const isNative =
    !!fromChain?.nativeTokenAddress &&
    isSameAddress(token.id, fromChain.nativeTokenAddress);

  if (!isNative && quote.approve_contract_id) {
    const rawAmount = getGasAccountBridgeRawAmount({
      token,
      usdValue,
    });
    const allowanceHex = await wallet.requestETHRpc<string>(
      {
        method: 'eth_call',
        params: [
          {
            to: token.id,
            data: abiCoder.encodeFunctionCall(
              {
                name: 'allowance',
                type: 'function',
                inputs: [
                  {
                    name: 'owner',
                    type: 'address',
                  },
                  {
                    name: 'spender',
                    type: 'address',
                  },
                ],
              },
              [
                toChecksumAddress(account.address),
                toChecksumAddress(quote.approve_contract_id),
              ]
            ),
          },
          'latest',
        ],
      },
      token.chain,
      account
    );
    const allowance = (abiCoder.decodeParameter(
      'uint256',
      allowanceHex
    ) as unknown) as string;
    const tokenApproved = new BigNumber(allowance).gte(rawAmount);

    if (!tokenApproved) {
      const approveResp = await wallet.approveToken(
        token.chain,
        token.id,
        quote.approve_contract_id,
        rawAmount,
        {
          ga: {
            category: 'GasAccount',
            action: 'deposit',
          },
        },
        undefined,
        undefined,
        true,
        account
      );
      txs.push(approveResp.params[0] as Tx);
    }
  }

  txs.push({
    from: quote.tx.from,
    to: quote.tx.to,
    value: quote.tx.value,
    data: quote.tx.data,
    chainId: quote.tx.chainId,
  } as Tx);

  return txs;
};

export const fetchGasAccountTopUpUsedNonce = async ({
  wallet,
  txHash,
  chainServerId,
  account,
}: {
  wallet: Pick<WalletControllerType, 'requestETHRpc'>;
  txHash: string;
  chainServerId: string;
  account: Account;
}) => {
  if (!txHash) {
    return undefined;
  }

  const tx = await wallet.requestETHRpc<{ nonce?: string } | null>(
    {
      method: 'eth_getTransactionByHash',
      params: [txHash],
    },
    chainServerId,
    account
  );

  return tx?.nonce;
};

export const isValidBridgeQuote = ({
  quote,
  accountAddress,
  chainServerId,
  gasAccountAddress,
}: {
  quote?: GasAccountBridgeQuote | null;
  accountAddress?: string;
  chainServerId?: string;
  gasAccountAddress?: string;
}) => {
  if (
    !quote ||
    !quote.bridge_id ||
    !quote.tx ||
    !quote.tx.from ||
    !quote.tx.to ||
    !gasAccountAddress
  ) {
    return false;
  }

  const chain = chainServerId ? findChainByServerID(chainServerId) : null;
  if (!chain || Number(quote.tx.chainId) !== Number(chain.id)) {
    return false;
  }

  if (!accountAddress || !isSameAddress(quote.tx.from, accountAddress)) {
    return false;
  }

  return Number(quote.to_token_amount || 0) > 0;
};

export const pollGasAccountBridgeStatus = async ({
  fetchStatus,
  interval = 3000,
  maxAttempts = 20,
  signal,
}: {
  fetchStatus: () => Promise<{ status: 'pending' | 'success' | 'failed' }>;
  interval?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      return { status: 'pending' as const };
    }
    const result = await fetchStatus();
    if (result.status !== 'pending') {
      return result;
    }

    await new Promise((resolve) => {
      const timer = setTimeout(resolve, interval);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve(undefined);
        },
        { once: true }
      );
    });
  }

  return {
    status: 'pending' as const,
  };
};
