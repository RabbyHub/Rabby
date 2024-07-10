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

export const dbk = defineChain({
  ...chainConfig,
  id: 20240603,
  name: 'DBK Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.mainnet.dbkchain.io/'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://scan.dbkchain.io/' },
  },
  contracts: {
    ...chainConfig.contracts,

    // l2CrossDomainMessenger: {
    //   1: {
    //     address: '0x307c7773097445400d2F2a51D65e38AEa8231868',
    //   },
    // },
    l2OutputOracle: {
      1: {
        address: '0x0341bb689CB8a4c16c61307F4BdA254E1bFD525e',
      },
    },
    // multicall3: {
    //   address: '0xca11bde05977b3631167028862be2a173976ca11',
    //   blockCreated: 5022,
    // },
    portal: {
      [1]: {
        address: '0x63CA00232F471bE2A3Bf3C4e95Bc1d2B3EA5DB92',
        // blockCreated: 17482143,
      },
    },
    l1StandardBridge: {
      [1]: {
        address: '0x28f1b9F457CB51E0af56dff1d11CD6CEdFfD1977',
        // blockCreated: 17482143,
      },
    },
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
  console.log(chain);
  return createWalletClient({
    chain: viemChain,
    transport: custom({
      async request({ method, params }) {
        console.log(method, params, chainId);
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
  return createViemClient({ chainId, viemChain: dbk, wallet })
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
