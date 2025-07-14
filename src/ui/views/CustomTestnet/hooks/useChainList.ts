// hooks/useChainList.ts
import { useQuery } from '@tanstack/react-query';

interface ChainData {
  name: string;
  chain: string;
  icon?: string;
  rpc: string[];
  features?: string[];
  faucets: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  infoURL: string;
  shortName: string;
  chainId: number;
  networkId: number;
  explorers?: {
    name: string;
    url: string;
    standard: string;
  }[];
}

const fetchChainList = async (): Promise<Record<string, ChainData>> => {
  const response = await fetch('https://chainlist.org/rpcs.json');
  if (!response.ok) {
    throw new Error('Failed to fetch chain list');
  }
  return response.json();
};

export const useChainList = () => {
  return useQuery({
    queryKey: ['chainList'],
    queryFn: fetchChainList,
    // staleTime: 1000 * 60 * 60, // 1 hour
    // gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};
