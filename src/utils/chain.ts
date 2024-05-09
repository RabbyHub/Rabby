// import { customTestnetService } from '@/background/service/customTestnet';
import {
  CustomTestnetToken,
  TestnetChain,
} from '@/background/service/customTestnet';
import defaultSuppordChain from '@/constant/default-support-chains.json';
import eventBus from '@/eventBus';
import { Chain } from '@debank/common';
import {
  ChainWithBalance,
  SupportedChain,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { CHAINS, CHAINS_ENUM, EVENTS } from 'consts';
import { toHex } from 'viem';
import browser from 'webextension-polyfill';

export const getMainnetListFromLocal = () => {
  return browser.storage.local.get('rabbyMainnetChainList').then((res) => {
    return res?.rabbyMainnetChainList || [];
  });
};

getMainnetListFromLocal().then((list) => {
  if (list.length) {
    updateChainStore({
      mainnetList: list,
    });
  }
});

const store = {
  mainnetList: defaultSuppordChain
    .filter((item) => !item.is_disabled)
    .map((item) => {
      return supportedChainToChain(item);
    }),
  testnetList: [] as TestnetChain[],
};

export const updateChainStore = (params: Partial<typeof store>) => {
  Object.assign(store, params);
  eventBus.emit(EVENTS.broadcastToUI, {
    method: 'syncChainList',
    params,
  });
};

export const getTestnetChainList = () => {
  return store.testnetList;
};

export const getMainnetChainList = () => {
  return store.mainnetList;
};

export const getChainList = (net?: 'mainnet' | 'testnet') => {
  if (net === 'mainnet') {
    return store.mainnetList;
  }
  if (net === 'testnet') {
    return store.testnetList;
  }
  return [...store.mainnetList, ...store.testnetList];
};

export const findChain = (params: {
  enum?: CHAINS_ENUM | string | null;
  id?: number | null;
  serverId?: string | null;
  hex?: string | null;
  networkId?: string | null;
}): Chain | TestnetChain | null | undefined => {
  const { enum: chainEnum, id, serverId, hex, networkId } = params;
  if (chainEnum && chainEnum.startsWith('CUSTOM_')) {
    return findChain({
      id: +chainEnum.replace('CUSTOM_', ''),
    });
  }
  const chain = [...store.mainnetList, ...store.testnetList].find(
    (item) =>
      item.enum === chainEnum ||
      (id && +item.id === +id) ||
      item.serverId === serverId ||
      item.hex === hex ||
      item.network === networkId
  );

  return chain;
};

/**
 * @description safe find chain, if not found, return fallback(if provided) or null
 */
export function findChainByEnum(
  chainEnum?: CHAINS_ENUM | string,
  options?: {
    fallback?: true | CHAINS_ENUM;
  }
): Chain | null {
  const fallbackIdx = !options?.fallback
    ? null
    : typeof options?.fallback === 'string'
    ? options?.fallback
    : ('ETH' as const);
  const toFallbackEnum: CHAINS_ENUM | null = fallbackIdx
    ? CHAINS_ENUM[fallbackIdx] || CHAINS_ENUM.ETH
    : null;
  const toFallbackChain = toFallbackEnum ? CHAINS[toFallbackEnum] : null;

  if (!chainEnum) return toFallbackChain;

  return findChain({ enum: chainEnum }) || toFallbackChain;
}

export function filterChainEnum(chainEnum: CHAINS_ENUM) {
  return findChainByEnum(chainEnum)?.enum || null;
}

export function ensureChainHashValid<
  T extends {
    [K in CHAINS_ENUM]?: any;
  }
>(obj: T) {
  const newObj = <T>{};
  Object.entries(obj).forEach(([chainEnum, value]) => {
    if (findChainByEnum(chainEnum)) {
      newObj[chainEnum as any] = value;
    }
  });

  return newObj;
}

export function ensureChainListValid<T extends CHAINS_ENUM[]>(list: T) {
  return list.filter((chainEnum) => findChainByEnum(chainEnum));
}

/**
 * @description safe find chain
 */
export function findChainByID(chainId: Chain['id']) {
  return findChain({
    id: chainId,
  });
}

/**
 * @description safe find chain by serverId
 */
export function findChainByServerID(chainId: Chain['serverId']) {
  return findChain({
    serverId: chainId,
  });
}

export function isTestnet(chainServerId?: string) {
  if (!chainServerId) return false;
  const chain = findChainByServerID(chainServerId);
  if (!chain) return false;
  return !!chain.isTestnet;
}

export function isTestnetChainId(chainId?: string | number) {
  if (!chainId) return false;
  const chain = findChainByID(Number(chainId));
  if (!chain) return false;
  return !!chain.isTestnet;
}

export interface DisplayChainWithWhiteLogo extends ChainWithBalance {
  logo?: string;
  whiteLogo?: string;
}

export function formatChainToDisplay(
  item: ChainWithBalance
): DisplayChainWithWhiteLogo {
  const chain = findChain({
    id: item.community_id,
  });
  return {
    ...item,
    logo: chain?.logo || item.logo_url,
    whiteLogo: chain?.whiteLogo,
  };
}

export function sortChainItems<T extends Chain>(
  items: T[],
  opts?: {
    cachedChainBalances?: {
      [P in Chain['serverId']]?: DisplayChainWithWhiteLogo;
    };
    supportChains?: CHAINS_ENUM[];
  }
) {
  const { cachedChainBalances = {}, supportChains } = opts || {};

  return (
    items
      // .map((item, index) => ({
      //   ...item,
      //   index,
      // }))
      .sort((a, b) => {
        const aBalance = cachedChainBalances[a.serverId]?.usd_value || 0;
        const bBalance = cachedChainBalances[b.serverId]?.usd_value || 0;

        if (!supportChains) {
          return aBalance > bBalance ? -1 : 1;
        }

        if (supportChains.includes(a.enum) && !supportChains.includes(b.enum)) {
          return -1;
        }
        if (!supportChains.includes(a.enum) && supportChains.includes(b.enum)) {
          return 1;
        }

        return aBalance > bBalance ? -1 : 1;
      })
  );
}

function searchChains(options: {
  list: Chain[];
  pinned: string[];
  searchKeyword: string;
}) {
  const { list, pinned } = options;
  let { searchKeyword = '' } = options;

  searchKeyword = searchKeyword?.trim().toLowerCase();
  if (!searchKeyword) {
    return list.filter((item) => !pinned.includes(item.enum));
  }
  const res = list.filter((item) =>
    [item.name, item.enum, item.nativeTokenSymbol].some((item) =>
      item.toLowerCase().includes(searchKeyword)
    )
  );
  return res
    .filter((item) => pinned.includes(item.enum))
    .concat(res.filter((item) => !pinned.includes(item.enum)));
}

export function varyAndSortChainItems(deps: {
  supportChains?: CHAINS_ENUM[];
  searchKeyword?: string;
  pinned: CHAINS_ENUM[];
  matteredChainBalances: {
    [x: string]: DisplayChainWithWhiteLogo | undefined;
  };
  netTabKey?: import('@/ui/component/PillsSwitch/NetSwitchTabs').NetSwitchTabsKey;
  mainnetList?: Chain[];
  testnetList?: Chain[];
}) {
  const {
    supportChains,
    searchKeyword = '',
    pinned,
    matteredChainBalances,
    netTabKey,
    mainnetList = store.mainnetList,
    testnetList = store.testnetList,
  } = deps;

  const unpinnedListGroup = {
    withBalance: [] as Chain[],
    withoutBalance: [] as Chain[],
    disabled: [] as Chain[],
  };
  const pinnedListGroup = {
    withBalance: [] as Chain[],
    withoutBalance: [] as Chain[],
    disabled: [] as Chain[],
  };

  const _all = (
    (netTabKey === 'testnet' ? testnetList : mainnetList) || []
  ).sort((a, b) => a.name.localeCompare(b.name));

  _all.forEach((item) => {
    const inPinned = pinned.find((pinnedEnum) => pinnedEnum === item.enum);

    if (!inPinned) {
      if (supportChains?.length && !supportChains.includes(item.enum)) {
        unpinnedListGroup.disabled.push(item);
      } else if (!matteredChainBalances[item.serverId]) {
        unpinnedListGroup.withoutBalance.push(item);
      } else {
        unpinnedListGroup.withBalance.push(item);
      }
    } else {
      if (supportChains?.length && !supportChains.includes(item.enum)) {
        pinnedListGroup.disabled.push(item);
      } else if (!matteredChainBalances[item.serverId]) {
        pinnedListGroup.withoutBalance.push(item);
      } else {
        pinnedListGroup.withBalance.push(item);
      }
    }
  });

  const allSearched = searchChains({
    list: _all,
    pinned,
    searchKeyword: searchKeyword?.trim() || '',
  });

  pinnedListGroup.withBalance = sortChainItems(pinnedListGroup.withBalance, {
    supportChains,
    cachedChainBalances: matteredChainBalances,
  });
  unpinnedListGroup.withBalance = sortChainItems(
    unpinnedListGroup.withBalance,
    {
      supportChains,
      cachedChainBalances: matteredChainBalances,
    }
  );
  pinnedListGroup.disabled = sortChainItems(pinnedListGroup.disabled, {
    supportChains,
    cachedChainBalances: matteredChainBalances,
  });
  unpinnedListGroup.disabled = sortChainItems(unpinnedListGroup.disabled, {
    supportChains,
    cachedChainBalances: matteredChainBalances,
  });

  return {
    allSearched,
    matteredList: [
      ...pinnedListGroup.withBalance,
      ...pinnedListGroup.withoutBalance,
      ...unpinnedListGroup.withBalance,
      ...pinnedListGroup.disabled,
    ],
    unmatteredList: [
      ...unpinnedListGroup.withoutBalance,
      ...unpinnedListGroup.disabled,
    ],
  };
}

export function makeTokenFromChain(chain: Chain): TokenItem {
  return {
    id: chain.nativeTokenAddress,
    decimals: chain.nativeTokenDecimals,
    logo_url: chain.nativeTokenLogo,
    symbol: chain.nativeTokenSymbol,
    display_symbol: chain.nativeTokenSymbol,
    optimized_symbol: chain.nativeTokenSymbol,
    is_core: true,
    is_verified: true,
    is_wallet: true,
    amount: 0,
    price: 0,
    name: chain.nativeTokenSymbol,
    chain: chain.serverId,
    time_at: 0,
  };
}

export function supportedChainToChain(item: SupportedChain): Chain {
  const chainServerIdEnumDict = {
    eth: 'ETH',
    bsc: 'BSC',
    xdai: 'GNOSIS',
    matic: 'POLYGON',
    ftm: 'FTM',
    okt: 'OKT',
    heco: 'HECO',
    avax: 'AVAX',
    arb: 'ARBITRUM',
    op: 'OP',
    celo: 'CELO',
    movr: 'MOVR',
    cro: 'CRO',
    boba: 'BOBA',
    metis: 'METIS',
    btt: 'BTT',
    aurora: 'AURORA',
    mobm: 'MOBM',
    sbch: 'SBCH',
    hmy: 'HMY',
    fuse: 'FUSE',
    astar: 'ASTAR',
    klay: 'KLAY',
    rsk: 'RSK',
    iotx: 'IOTX',
    kcc: 'KCC',
    wan: 'WAN',
    sgb: 'SGB',
    evmos: 'EVMOS',
    dfk: 'DFK',
    tlos: 'TLOS',
    nova: 'NOVA',
    canto: 'CANTO',
    doge: 'DOGE',
    step: 'STEP',
    kava: 'KAVA',
    mada: 'MADA',
    cfx: 'CFX',
    brise: 'BRISE',
    ckb: 'CKB',
    tomb: 'TOMB',
    pze: 'PZE',
    era: 'ERA',
    eos: 'EOS',
    core: 'CORE',
    flr: 'FLR',
    wemix: 'WEMIX',
    mtr: 'METER',
    etc: 'ETC',
    fsn: 'FSN',
    pls: 'PULSE',
    rose: 'ROSE',
    ron: 'RONIN',
    oas: 'OAS',
    zora: 'ZORA',
    linea: 'LINEA',
    base: 'BASE',
    mnt: 'MANTLE',
    tenet: 'TENET',
    lyx: 'LYX',
    opbnb: 'OPBNB',
    loot: 'LOOT',
    shib: 'SHIB',
    manta: 'MANTA',
    scrl: 'SCRL',
    fx: 'FX',
    beam: 'BEAM',
    pego: 'PEGO',
    zkfair: 'ZKFAIR',
    fon: 'FON',
    bfc: 'BFC',
    alot: 'ALOT',
    xai: 'XAI',
    zeta: 'ZETA',
    rari: 'RARI',
    hubble: 'HUBBLE',
    mode: 'MODE',
    merlin: 'MERLIN',
    dym: 'DYM',
    eon: 'EON',
    blast: 'BLAST',
    sx: 'SX',
    platon: 'PLATON',
    map: 'MAP',
    frax: 'FRAX',
    aze: 'AZE',
    karak: 'KARAK',
  };
  return {
    id: item.community_id,
    enum: chainServerIdEnumDict[item.id] || item.id.toUpperCase(),
    name: item.name,
    serverId: item.id,
    hex: toHex(+item.community_id),
    network: item.community_id + '',
    nativeTokenSymbol: item.native_token?.symbol,
    nativeTokenLogo: item.native_token?.logo,
    nativeTokenDecimals: item.native_token?.decimals,
    nativeTokenAddress: item.native_token?.id,
    needEstimateGas: item.need_estimate_gas,
    scanLink: `${item.explorer_host}/${
      item.id === 'heco' ? 'transaction' : 'tx'
    }/_s_`,
    logo: item.logo_url,
    whiteLogo: item.white_logo_url,
    eip: {
      '1559': item.eip_1559,
    },
  };
}

export const isSameTesnetToken = <
  T1 extends Pick<CustomTestnetToken, 'id' | 'chainId'>,
  T2 extends Pick<CustomTestnetToken, 'id' | 'chainId'>
>(
  token1: T1,
  token2: T2
) => {
  if (!token1 || !token2) {
    return false;
  }
  return (
    token1.id?.toLowerCase() === token2.id?.toLowerCase() &&
    +token1.chainId === +token2.chainId
  );
};
