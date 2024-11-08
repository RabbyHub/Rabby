import { useWallet } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import { createWalletClient, custom, defineChain, publicActions } from 'viem';
import {
  chainConfig,
} from 'viem/op-stack';

export const sonicTestnet = defineChain({
  ...chainConfig,
  id: 64165,
  name: 'Sonic Testnet',
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
