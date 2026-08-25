import type { Chain } from '@debank/common';
import { create } from 'zustand';

import type {
  Account,
  CurvePointCollection,
} from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import type { AccountScene } from '@/constant/scene-account';
import { wallet } from '@/ui/wallet';
import { coerceFloat } from '@/ui/utils/number';
import { requestOpenApiMultipleNets } from '@/ui/utils/openapi';
import type { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import {
  formatChainToDisplay,
  isTestnet as checkIsTestnet,
} from '@/utils/chain';
import type { DisplayChainWithWhiteLogo } from '@/utils/chain';
import type { DisplayedKeryring } from 'background/service/keyring';
import type {
  ApprovalStatus,
  TotalBalanceResponse,
} from 'background/service/openapi';

interface TotalBalanceWithEvmUsdValue extends TotalBalanceResponse {
  evmUsdValue?: number;
  appChainIds?: string[];
}

type MatteredChainBalancesResult = {
  mainnet: TotalBalanceResponse | null;
  testnet: TotalBalanceResponse | null;
};

type MatteredChainBalancesState = {
  matteredChainBalances: AccountState['matteredChainBalances'];
  testnetMatteredChainBalances: AccountState['testnetMatteredChainBalances'];
};

const symLoaderMatteredBalance = Symbol('uiHelperMateeredChainBalancesPromise');

export interface AccountState {
  currentAccount: null | Account;
  visibleAccounts: DisplayedKeryring[];
  hiddenAccounts: Account[];
  keyrings: DisplayedKeryring[];
  balanceAboutCache: {
    totalBalance: TotalBalanceResponse | null;
    curvePoints: CurvePointCollection;
  };
  balanceAboutCacheMap: {
    balanceMap: Record<string, TotalBalanceWithEvmUsdValue>;
    curvePointsMap: Record<string, CurvePointCollection>;
  };
  matteredChainBalances: {
    [P in Chain['serverId']]?: DisplayChainWithWhiteLogo;
  };
  testnetMatteredChainBalances: {
    [P in Chain['serverId']]?: DisplayChainWithWhiteLogo;
  };
  tokens: {
    list: AbstractPortfolioToken[];
    customize: AbstractPortfolioToken[];
    blocked: AbstractPortfolioToken[];
  };
  testnetTokens: {
    list: AbstractPortfolioToken[];
    customize: AbstractPortfolioToken[];
    blocked: AbstractPortfolioToken[];
  };
  mnemonicAccounts: DisplayedKeryring[];
  [symLoaderMatteredBalance]: Promise<MatteredChainBalancesState> | null;
  approvalStatus: Record<string, ApprovalStatus[]>;
  sceneAccountMap: Partial<Record<AccountScene, Account | null>>;
}

export type AccountActions = {
  setField: (payload: Partial<AccountState>) => void;
  setTestnetTokenList: (payload: AbstractPortfolioToken[]) => void;
  setTokenList: (payload: AbstractPortfolioToken[]) => void;
  setTestnetCustomizeTokenList: (payload: AbstractPortfolioToken[]) => void;
  setCustomizeTokenList: (payload: AbstractPortfolioToken[]) => void;
  setBlockedTokenList: (payload: AbstractPortfolioToken[]) => void;
  setTestnetBlockedTokenList: (payload: AbstractPortfolioToken[]) => void;
  setCurrentAccount: (payload: {
    currentAccount: AccountState['currentAccount'];
  }) => void;
  setApprovalStatus: (payload: Record<string, ApprovalStatus[]>) => void;
  onAccountChanged: (currentAccountAddress?: string) => Promise<void>;
  getCurrentAccountAsync: () => Promise<Account | null>;
  getSceneAccountMap: () => Promise<void>;
  switchSceneAccount: (payload: {
    scene: AccountScene;
    account: Account;
  }) => Promise<void>;
  changeAccountAsync: (account: Account) => Promise<void>;
  resetTokenList: () => Promise<void>;
  getAllClassAccountsAsync: () => Promise<DisplayedKeryring[]>;
  getAllVisibleAccountsAsync: () => Promise<DisplayedKeryring[]>;
  getAllHiddenAccountsAsync: () => Promise<Account[]>;
  getTypedMnemonicAccountsAsync: () => Promise<void>;
  getPersistedBalanceAboutCacheAsync: (
    address?: string
  ) => Promise<AccountState['balanceAboutCacheMap'] | null | undefined>;
  addCustomizeToken: (token: AbstractPortfolioToken) => Promise<void>;
  removeCustomizeToken: (token: AbstractPortfolioToken) => Promise<void>;
  addBlockedToken: (
    token: AbstractPortfolioToken
  ) => Promise<AbstractPortfolioToken>;
  removeBlockedToken: (
    token: AbstractPortfolioToken
  ) => Promise<AbstractPortfolioToken>;
  triggerFetchBalanceOnBackground: (options?: {
    forceUpdate?: boolean;
  }) => Promise<void>;
  getMatteredChainBalance: (options?: {
    currentAccountAddress?: string;
    leastLoadingTime?: boolean;
  }) => Promise<{
    matteredChainBalances: AccountState['matteredChainBalances'];
    testnetMatteredChainBalances: AccountState['testnetMatteredChainBalances'];
  }>;
};

export type AccountStore = AccountState & AccountActions;

export const getDefaultAccountState = (): AccountState => ({
  currentAccount: null,
  visibleAccounts: [],
  hiddenAccounts: [],
  keyrings: [],
  balanceAboutCache: {
    totalBalance: null,
    curvePoints: [],
  },
  balanceAboutCacheMap: {
    balanceMap: {},
    curvePointsMap: {},
  },
  matteredChainBalances: {},
  testnetMatteredChainBalances: {},
  mnemonicAccounts: [],
  tokens: {
    list: [],
    customize: [],
    blocked: [],
  },
  testnetTokens: {
    list: [],
    customize: [],
    blocked: [],
  },
  [symLoaderMatteredBalance]: null,
  approvalStatus: {},
  sceneAccountMap: {},
});

/**
 * Filter chains with balance:
 * 1. greater than $1 and has percentage 1%
 * 2. or >= $1000
 */
export function isChainMattered(chainUsdValue: number, totalUsdValue: number) {
  return (
    chainUsdValue >= 1000 ||
    (chainUsdValue > 1 && chainUsdValue / totalUsdValue > 0.01)
  );
}

export const selectIsShowMnemonic = (state: AccountState) =>
  state.mnemonicAccounts.length <= 0;

export const selectCurrentAccountAddr = (state: AccountState) =>
  state.currentAccount?.address;

export const selectCurrentBalanceAboutMap = (state: AccountState) =>
  state.balanceAboutCacheMap;

export const selectAllMatteredChainBalances = (state: AccountState) => ({
  ...state.testnetMatteredChainBalances,
  ...state.matteredChainBalances,
});

export const selectIsLoadingMatteredChainBalances = (state: AccountState) =>
  !!state[symLoaderMatteredBalance];

export const useAccountStore = create<AccountStore>()((set, get) => ({
  ...getDefaultAccountState(),

  setField(payload) {
    set(payload);
  },
  setTestnetTokenList(list) {
    set((state) => ({
      testnetTokens: { ...state.testnetTokens, list },
    }));
  },
  setTokenList(list) {
    set((state) => ({
      tokens: { ...state.tokens, list },
    }));
  },
  setTestnetCustomizeTokenList(customize) {
    set((state) => ({
      testnetTokens: { ...state.testnetTokens, customize },
    }));
  },
  setCustomizeTokenList(customize) {
    set((state) => ({
      tokens: { ...state.tokens, customize },
    }));
  },
  setBlockedTokenList(blocked) {
    set((state) => ({
      tokens: { ...state.tokens, blocked },
    }));
  },
  setTestnetBlockedTokenList(blocked) {
    set((state) => ({
      testnetTokens: { ...state.testnetTokens, blocked },
    }));
  },
  setCurrentAccount({ currentAccount }) {
    set({ currentAccount });
  },
  setApprovalStatus(payload) {
    set((state) => ({
      approvalStatus: { ...state.approvalStatus, ...payload },
    }));
  },

  async onAccountChanged(currentAccountAddress) {
    try {
      const address =
        currentAccountAddress || (await wallet.getCurrentAccount())?.address;
      await get().getMatteredChainBalance({
        currentAccountAddress: address,
        leastLoadingTime: true,
      });
    } catch (error) {
      console.debug('error on getMatteredChainBalance');
      console.error(error);
    }
  },
  async getCurrentAccountAsync() {
    const account = await wallet.getCurrentAccount<Account>();
    if (account) {
      set({ currentAccount: account });
    }
    return account || null;
  },
  async getSceneAccountMap() {
    const sceneAccountMap = await wallet.getPreference<
      AccountState['sceneAccountMap']
    >('sceneAccountMap');
    if (sceneAccountMap) {
      set({ sceneAccountMap });
    }
  },
  async switchSceneAccount(payload) {
    await wallet.switchSceneAccount(payload);
    set((state) => ({
      sceneAccountMap: {
        ...state.sceneAccountMap,
        [payload.scene]: payload.account,
      },
    }));
  },
  async changeAccountAsync(account) {
    const { address, type, brandName } = account;
    const nextVal: Account = { address, type, brandName };
    await wallet.changeAccount(nextVal);
    set({ currentAccount: nextVal });
  },
  async resetTokenList() {
    set({
      tokens: { list: [], customize: [], blocked: [] },
      testnetTokens: { list: [], customize: [], blocked: [] },
    });
  },
  async getAllClassAccountsAsync() {
    const keyrings = await wallet.getAllClassAccounts<DisplayedKeryring[]>();
    set({ keyrings });
    return keyrings;
  },
  async getAllVisibleAccountsAsync() {
    const visibleAccounts = await wallet.getAllVisibleAccounts();
    set({ visibleAccounts });
    return visibleAccounts;
  },
  async getAllHiddenAccountsAsync() {
    const hiddenAccounts = await wallet.getHiddenAddresses<Account[]>();
    set({ hiddenAccounts });
    return hiddenAccounts;
  },
  async getTypedMnemonicAccountsAsync() {
    const mnemonicAccounts = await wallet.getTypedAccounts(
      KEYRING_CLASS.MNEMONIC
    );
    set({ mnemonicAccounts });
  },
  async getPersistedBalanceAboutCacheAsync() {
    const result = await wallet.getPersistedBalanceAboutCacheMap();
    if (result) {
      set({
        balanceAboutCacheMap: {
          balanceMap: result.balanceMap || {},
          curvePointsMap: result.curvePointsMap || {},
        },
      });
    }
    return result;
  },
  async addCustomizeToken(token) {
    await wallet.addCustomizedToken({
      address: token._tokenId,
      chain: token.chain,
    });
    const isTestnetToken = checkIsTestnet(token.chain);
    const tokenState = isTestnetToken ? get().testnetTokens : get().tokens;
    const nextTokenState = {
      ...tokenState,
      customize: [...tokenState.customize, token],
      list: token.amount > 0 ? [...tokenState.list, token] : tokenState.list,
    };
    set(
      isTestnetToken
        ? { testnetTokens: nextTokenState }
        : { tokens: nextTokenState }
    );
  },
  async removeCustomizeToken(token) {
    await wallet.removeCustomizedToken({
      address: token._tokenId,
      chain: token.chain,
    });
    const isTestnetToken = checkIsTestnet(token.chain);
    const tokenState = isTestnetToken ? get().testnetTokens : get().tokens;
    const nextTokenState = {
      ...tokenState,
      customize: tokenState.customize.filter((item) => item.id !== token.id),
      list: tokenState.list.filter((item) => item.id !== token.id),
    };
    set(
      isTestnetToken
        ? { testnetTokens: nextTokenState }
        : { tokens: nextTokenState }
    );
  },
  async addBlockedToken(token) {
    await wallet.addBlockedToken({
      address: token._tokenId,
      chain: token.chain,
    });
    const isTestnetToken = checkIsTestnet(token.chain);
    const tokenState = isTestnetToken ? get().testnetTokens : get().tokens;
    const nextTokenState = {
      ...tokenState,
      blocked: [...tokenState.blocked, token],
      list: tokenState.list.filter((item) => item.id !== token.id),
    };
    set(
      isTestnetToken
        ? { testnetTokens: nextTokenState }
        : { tokens: nextTokenState }
    );
    return token;
  },
  async removeBlockedToken(token) {
    await wallet.removeBlockedToken({
      address: token._tokenId,
      chain: token.chain,
    });
    const isTestnetToken = checkIsTestnet(token.chain);
    const tokenState = isTestnetToken ? get().testnetTokens : get().tokens;
    const nextTokenState = {
      ...tokenState,
      blocked: tokenState.blocked.filter((item) => item.id !== token.id),
      list: token.amount > 0 ? [...tokenState.list, token] : tokenState.list,
    };
    set(
      isTestnetToken
        ? { testnetTokens: nextTokenState }
        : { tokens: nextTokenState }
    );
    return token;
  },
  async triggerFetchBalanceOnBackground() {
    const currentAccount = get().currentAccount;
    if (!currentAccount?.address) return;

    const isShowTestnet = await wallet.getPreference<boolean>('isShowTestnet');
    await requestOpenApiMultipleNets<TotalBalanceResponse | null, void>(
      (ctx) =>
        wallet.getInMemoryAddressBalance(
          currentAccount.address,
          true,
          ctx.isTestnetTask
        ),
      {
        wallet,
        needTestnetResult: isShowTestnet,
        processResults: () => null,
        fallbackValues: {
          mainnet: null,
          testnet: null,
        },
      }
    );
  },
  async getMatteredChainBalance(options) {
    const currentAccountAddress =
      options?.currentAccountAddress || get().currentAccount?.address || '';

    const loader = (async () => {
      let result: MatteredChainBalancesResult = {
        mainnet: null,
        testnet: null,
      };
      try {
        const response = await wallet.getAddressCacheBalance(
          currentAccountAddress
        );
        result = { mainnet: response, testnet: null };
      } catch (error) {
        console.error(error);
      }

      const mainnetTotalUsdValue = (result.mainnet?.chain_list || []).reduce(
        (total, chain) => total + coerceFloat(chain.usd_value),
        0
      );
      const matteredChainBalances = (result.mainnet?.chain_list || []).reduce(
        (balances, chain) => {
          const chainUsdValue = coerceFloat(chain.usd_value);
          if (isChainMattered(chainUsdValue, mainnetTotalUsdValue)) {
            balances[chain.id] = formatChainToDisplay(chain);
          }
          return balances;
        },
        {} as AccountState['matteredChainBalances']
      );

      const testnetTotalUsdValue = (result.testnet?.chain_list || []).reduce(
        (total, chain) => total + coerceFloat(chain.usd_value),
        0
      );
      const testnetMatteredChainBalances = (
        result.testnet?.chain_list || []
      ).reduce((balances, chain) => {
        const chainUsdValue = coerceFloat(chain.usd_value);
        if (isChainMattered(chainUsdValue, testnetTotalUsdValue)) {
          balances[chain.id] = formatChainToDisplay(chain);
        }
        return balances;
      }, {} as AccountState['testnetMatteredChainBalances']);

      set({ matteredChainBalances, testnetMatteredChainBalances });
      return { matteredChainBalances, testnetMatteredChainBalances };
    })();

    set({ [symLoaderMatteredBalance]: loader });
    try {
      return await loader;
    } finally {
      if (get()[symLoaderMatteredBalance] === loader) {
        set({ [symLoaderMatteredBalance]: null });
      }
    }
  },
}));

// Rematch consumers are migrated independently. Keep one stable compatibility
// object so existing dispatch.account call sites use Zustand as their source
// of truth during that transition.
export const accountActions: AccountActions = new Proxy({} as AccountActions, {
  get(_target, property: keyof AccountActions) {
    return useAccountStore.getState()[property];
  },
});
