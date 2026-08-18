import { create } from 'zustand';

import type { WalletControllerType } from '@/ui/utils';
import { wallet } from '@/ui/wallet';

export interface Exchange {
  id: string;
  name: string;
  logo: string;
}

const initialExchanges: Exchange[] = [
  {
    id: 'binance',
    name: 'Binance',
    logo:
      'https://static.debank.com/image/cex/logo_url/binance/fb6046e6a5bd0bd4f1286cc0defbad31.png',
  },
  {
    id: 'bitget',
    name: 'Bitget',
    logo:
      'https://static.debank.com/image/cex/logo_url/bitget/4d46c0c1689f43433bd357e747b720b0.png',
  },
  {
    id: 'bybit',
    name: 'Bybit',
    logo:
      'https://static.debank.com/image/cex/logo_url/bybit/f6a9cba314a9528faaf74ab7ba6fe375.png',
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    logo:
      'https://static.debank.com/image/cex/logo_url/coinbase/baf3eb82a7f897fe46ba0caf42470342.png',
  },
  {
    id: 'gate',
    name: 'Gate.io',
    logo:
      'https://static.debank.com/image/cex/logo_url/gate/83ee48dd7cc2aa57ef333ff2af5d780b.png',
  },
  {
    id: 'kraken',
    name: 'Kraken',
    logo:
      'https://static.debank.com/image/cex/logo_url/kraken/f1d10ec41e960ec518bf302c9c125ebf.png',
  },
  {
    id: 'kucoin',
    name: 'KuCoin',
    logo:
      'https://static.debank.com/image/cex/logo_url/kucoin/52d4356b4b4b62af06b1d4fff66bf7d8.png',
  },
  {
    id: 'mexc',
    name: 'MEXC',
    logo:
      'https://static.debank.com/image/cex/logo_url/mexc/cb3d19f646fbcbeb58b4e50e709b3c7d.png',
  },
  {
    id: 'okex',
    name: 'OKX',
    logo:
      'https://static.debank.com/image/cex/logo_url/okex/7dffa8dcee98ef99958ed304bf0b2648.png',
  },
];

export const globalSupportCexList: Exchange[] = [];

export type ExchangeState = {
  exchanges: Exchange[];
};

type ExchangeActions = {
  init: () => Promise<void>;
};

export type ExchangeStore = ExchangeState & ExchangeActions;

export function getDefaultExchangeState(): ExchangeState {
  return {
    exchanges: initialExchanges.map((exchange) => ({ ...exchange })),
  };
}

export const useExchangeStore = create<ExchangeStore>()((set) => ({
  ...getDefaultExchangeState(),

  async init() {
    try {
      const cexLists = await wallet.openapi.getCexSupportList();
      if (cexLists.length) {
        const exchanges = cexLists.map((item) => ({
          id: item.id,
          name: item.name,
          logo: item.logo_url,
        }));

        if (globalSupportCexList.length === 0) {
          globalSupportCexList.push(...exchanges);
        }
        set({ exchanges });
      }
    } catch {
      // Keep using the built-in exchange list when the remote request fails.
    } finally {
      if (globalSupportCexList.length === 0) {
        globalSupportCexList.push(...initialExchanges);
      }
    }
  },
}));

export const initializeExchangeStore = () => useExchangeStore.getState().init();

export const getCexInfo = async (
  address: string,
  walletController: WalletControllerType
) => {
  try {
    if (!address || !walletController) {
      return undefined;
    }
    const cexId = await walletController.getCexId(address);
    const cexInfo = globalSupportCexList.find(
      (item) => item.id.toLowerCase() === cexId?.toLowerCase()
    );
    if (!cexInfo || !cexId) {
      return undefined;
    }
    return {
      id: cexId,
      name: cexInfo.name || '',
      logo: cexInfo.logo || '',
    };
  } catch {
    return undefined;
  }
};
