import React, { useState, useMemo, useEffect } from 'react';
import { useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DBK_CHAIN_ID, DBK_NFT_CONTRACT_ADDRESS } from '@/constant';

import { useMemoizedFn } from 'ahooks';
import { createPublicClient, http, defineChain, hexToNumber } from 'viem';

import { chainConfig } from 'viem/op-stack';

const dbkChain = defineChain({
  ...chainConfig,
  id: DBK_CHAIN_ID,
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
  contracts: {
    ...chainConfig.contracts,
  },
});

const NFT_ABI = [
  {
    inputs: [],
    name: 'mint',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenIdCounter',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export const useMintNFT = () => {
  const wallet = useWallet();
  const account = useCurrentAccount();
  const [totalMinted, setTotalMinted] = useState(0);
  const [userMinted, setUserMinted] = useState(0);

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: dbkChain,
        transport: http(),
      }),
    []
  );

  const mintNFT = () => {
    console.log('mint');

    wallet.mintDBKChainNFT();
  };

  const updateMintCounts = useMemoizedFn(async () => {
    if (!account?.address) return;

    try {
      const [currentTokenId, userBalance] = await Promise.all([
        publicClient.readContract({
          address: DBK_NFT_CONTRACT_ADDRESS,
          abi: NFT_ABI,
          functionName: 'tokenIdCounter',
        }),
        publicClient.readContract({
          address: DBK_NFT_CONTRACT_ADDRESS,
          abi: NFT_ABI,
          functionName: 'balanceOf',
          args: [account.address],
        }),
      ]);

      setTotalMinted(hexToNumber(currentTokenId as `0x${string}`));
      setUserMinted(hexToNumber(userBalance as `0x${string}`));
    } catch (error) {
      console.error('Failed to update mint counts:', error);
    }
  });

  useEffect(() => {
    updateMintCounts();
  }, [account?.address]);

  return {
    mintNFT,
    totalMinted,
    userMinted,
  };
};
