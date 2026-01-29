import { ChainId } from '@aave/contract-helpers';
import {
  BuildTxFunctions,
  constructBuildTx,
  constructFetchFetcher,
  constructGetRate,
  constructPartialSDK,
  GetRateFunctions,
} from '@paraswap/sdk';

const DEBT_FEE_TARGET = '0xcd6b980029e6e6e0733ac8ec3e02be9410d09799';

const ParaSwap = (chainId: number) => {
  const fetcher = constructFetchFetcher(fetch); // alternatively constructFetchFetcher
  return constructPartialSDK(
    {
      chainId,
      fetcher,
      version: '6.2',
    },
    constructBuildTx,
    constructGetRate
  );
};

type ParaswapChainMap = {
  [key in ChainId]?: {
    paraswap: BuildTxFunctions & GetRateFunctions;
    feeTarget: string;
  };
};

const paraswapNetworks: ParaswapChainMap = {
  [ChainId.mainnet]: {
    paraswap: ParaSwap(ChainId.mainnet),
    feeTarget: DEBT_FEE_TARGET,
  },
  [ChainId.polygon]: {
    paraswap: ParaSwap(ChainId.polygon),
    feeTarget: DEBT_FEE_TARGET,
  },
  [ChainId.avalanche]: {
    paraswap: ParaSwap(ChainId.avalanche),
    feeTarget: DEBT_FEE_TARGET,
  },
  [ChainId.arbitrum_one]: {
    paraswap: ParaSwap(ChainId.arbitrum_one),
    feeTarget: DEBT_FEE_TARGET,
  },
  [ChainId.optimism]: {
    paraswap: ParaSwap(ChainId.optimism),
    feeTarget: DEBT_FEE_TARGET,
  },
  [ChainId.base]: {
    paraswap: ParaSwap(ChainId.base),
    feeTarget: DEBT_FEE_TARGET,
  },
  [ChainId.bnb]: {
    paraswap: ParaSwap(ChainId.bnb),
    feeTarget: DEBT_FEE_TARGET,
  },
  [ChainId.xdai]: {
    paraswap: ParaSwap(ChainId.xdai),
    feeTarget: DEBT_FEE_TARGET,
  },
  [ChainId.sonic]: {
    paraswap: ParaSwap(ChainId.sonic),
    feeTarget: DEBT_FEE_TARGET,
  },
};

export const getParaswap = (chainId: ChainId) => {
  const paraswap = paraswapNetworks[chainId];
  if (paraswap) {
    return paraswap;
  }

  throw new Error('Chain not supported');
};

export const isMarketSupported = (chainId: ChainId) => {
  return Object.keys(paraswapNetworks).includes(chainId.toString());
};
