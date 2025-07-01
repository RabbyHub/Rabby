import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { WalletControllerType } from '../utils';

export interface Exchange {
  id: string;
  name: string;
  logo: string;
}

const initExchanges = [
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

type IState = {
  exchanges: Exchange[];
};

export const exchange = createModel<RootModel>()({
  name: 'exchange',
  state: {
    exchanges: initExchanges,
  } as IState,
  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
  },
  effects: () => ({
    async init(_: void, store) {
      store.app.wallet.openapi
        .getCexSupportList()
        .then((cexLists) => {
          if (cexLists.length) {
            globalSupportCexList.length === 0 &&
              globalSupportCexList.push(
                ...cexLists.map((item) => ({
                  id: item.id,
                  name: item.name,
                  logo: item.logo_url,
                }))
              );
            this.setField({
              exchanges: cexLists.map((item) => ({
                id: item.id,
                name: item.name,
                logo: item.logo_url,
              })),
            });
          }
        })
        .finally(() => {
          globalSupportCexList.length === 0 &&
            globalSupportCexList.push(...initExchanges);
        });
    },
  }),
});

export const getCexInfo = async (
  address: string,
  wallet: WalletControllerType
) => {
  try {
    if (!address || !wallet) {
      return undefined;
    }
    const cexId = await wallet.getCexId(address);
    const cexInfo = globalSupportCexList.find(
      (item) => item.id.toLocaleLowerCase() === cexId?.toLocaleLowerCase()
    );
    if (!cexInfo || !cexId) {
      return undefined;
    }
    return {
      id: cexId,
      name: cexInfo?.name || '',
      logo: cexInfo?.logo || '',
    };
  } catch (error) {
    return undefined;
  }
};
