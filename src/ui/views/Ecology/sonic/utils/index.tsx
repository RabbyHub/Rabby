import { DbkBridgeHistoryItem } from '@rabby-wallet/rabby-api/dist/types';

import { useWallet } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import { createWalletClient, custom, defineChain, publicActions } from 'viem';
import { mainnet } from 'viem/chains';
import {
  chainConfig,
  getL2TransactionHashes,
  publicActionsL1,
  publicActionsL2,
  walletActionsL1,
  walletActionsL2,
} from 'viem/op-stack';

export const sonicTestnet = defineChain({
  ...chainConfig,
  id: 64165,
  name: 'Sonic',
  nativeCurrency: {
    decimals: 18,
    name: 'S',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.soniclabs.com/'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'scan.soniclabs.com' },
  },
  sourceId: 1,
});

export const createViemClient = ({
  chainId,
  viemChain,
  wallet,
}: {
  chainId: number;
  viemChain: NonNullable<Parameters<typeof createWalletClient>[0]['chain']>;
  wallet: ReturnType<typeof useWallet>;
}) => {
  const chain = findChain({
    id: chainId,
  })!;
  return createWalletClient({
    chain: viemChain,
    transport: custom({
      async request({ method, params }) {
        if (
          method === 'eth_sendTransaction' &&
          params[0] &&
          !('chainId' in params[0])
        ) {
          params[0].chainId = chainId;
        }
        if (method === 'eth_sendTransaction') {
          return wallet.sendRequest<any>({
            method,
            params,
          });
        } else {
          return wallet.requestETHRpc<any>(
            {
              method,
              params,
            },
            chain.serverId
          );
        }
      },
    }),
  });
};

export const createL1Client = ({
  chainId,
  wallet,
}: {
  chainId: number;
  wallet: ReturnType<typeof useWallet>;
}) => {
  return createViemClient({ chainId, viemChain: mainnet, wallet })
    .extend(walletActionsL1())
    .extend(publicActionsL1())
    .extend(publicActions);
};

export const createL2Client = ({
  chainId,
  wallet,
}: {
  chainId: number;
  wallet: ReturnType<typeof useWallet>;
}) => {
  return createViemClient({ chainId, viemChain: sonicTestnet, wallet })
    .extend(walletActionsL2())
    .extend(publicActionsL2())
    .extend(publicActions);
};

export const checkBridgeStatus = async ({
  item,
  clientL1,
  clientL2,
}: {
  item: DbkBridgeHistoryItem;
  clientL1: ReturnType<typeof createL1Client>;
  clientL2: ReturnType<typeof createL2Client>;
}) => {
  if (item.is_deposit) {
    try {
      const l1Hash = item.tx_id;
      const receipt = await clientL1.getTransactionReceipt({
        hash: l1Hash as `0x${string}`,
      });
      const [l2Hash] = getL2TransactionHashes(receipt);
      await clientL2.getTransactionReceipt({
        hash: l2Hash,
      });
      return 'finalized' as const;
    } catch (e) {
      return 'deposit-pending' as const;
    }
  } else {
    try {
      const l2Hash = item.tx_id;
      const receipt = await clientL2.getTransactionReceipt({
        hash: l2Hash as `0x${string}`,
      });
      return clientL1.getWithdrawalStatus({
        receipt,
        targetChain: clientL2.chain as any,
      });
    } catch (e) {
      console.error(e);
    }
  }
};

export type DbkBridgeStatus = Awaited<ReturnType<typeof checkBridgeStatus>>;
