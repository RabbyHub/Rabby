/**
 * @jest-environment jsdom
 */
import contactMigration from '../../src/migrations/contactBookMigration';
import { PreferenceStore } from 'background/service/preference';

const data: { preference: PreferenceStore; contactBook } = {
  preference: {
    firstOpen: false,
    currentVersion: '',
    externalLinkAck: true,
    hiddenAddresses: [],
    isDefaultWallet: true,
    lastTimeSendToken: {
      '0x3c6923d09ec77648ca923ffb4e50251120756faa': {
        amount: 0.07683291,
        chain: 'eth',
        decimals: 18,
        display_symbol: null,
        id: 'eth',
        is_core: true,
        is_verified: true,
        is_wallet: true,
        logo_url:
          'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
        name: 'ETH',
        optimized_symbol: 'ETH',
        price: 2955.33,
        raw_amount: '76832910000000000',
        raw_amount_hex_str: '0x110f71fe39c0c00',
        symbol: 'ETH',
        time_at: 1483200000,
      },
    },
    currentAccount: null,
    initAlianNames: true,
    gasCache: {
      '1': {
        gasLevel: 'slow',
        lastTimeSelect: 'gasLevel',
      },
    },
    addedToken: {},
    alianNames: {
      '0x0dbba03df2fb0444081aa5dab355c8a2dcd9075b': 'Main Account',
      '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0': 'Mnemonic 5',
    },
    balanceMap: {},
    curvePointsMap: {},
    locale: 'en',
    nftApprovalChain: {},
    pinnedChain: [],
    tokenApprovalChain: {},
    useLedgerLive: false,
    highligtedAddresses: [],
    walletSavedList: [],
    watchAddressPreference: {},
    testnetBalanceMap: {},
    addressSortStore: {
      search: '',
      sortType: 'usd',
    },
  },
  contactBook: {
    '0x10b26700b0a2d3f5ef12fa250aba818ee3b43bf4': {
      address: '0x10b26700b0a2d3f5ef12fa250aba818ee3b43bf4',
      name: 'hongbo',
    },
    '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0': {
      address: '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0',
      name: 'test name',
    },
  },
};

test('should migrate data', () => {
  return contactMigration.migrator(data).then((result) => {
    expect(result!.preference).toEqual({
      firstOpen: false,
      currentVersion: '',
      externalLinkAck: true,
      hiddenAddresses: [],
      isDefaultWallet: true,
      lastTimeSendToken: {
        '0x3c6923d09ec77648ca923ffb4e50251120756faa': {
          amount: 0.07683291,
          chain: 'eth',
          decimals: 18,
          display_symbol: null,
          id: 'eth',
          is_core: true,
          is_verified: true,
          is_wallet: true,
          logo_url:
            'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
          name: 'ETH',
          optimized_symbol: 'ETH',
          price: 2955.33,
          raw_amount: '76832910000000000',
          raw_amount_hex_str: '0x110f71fe39c0c00',
          symbol: 'ETH',
          time_at: 1483200000,
        },
      },
      currentAccount: null,
      initAlianNames: true,
      gasCache: {
        '1': {
          gasLevel: 'slow',
          lastTimeSelect: 'gasLevel',
        },
      },
      addedToken: {},
      addressSortStore: {
        search: '',
        sortType: 'usd',
      },
      balanceMap: {},
      curvePointsMap: {},
      locale: 'en',
      nftApprovalChain: {},
      pinnedChain: [],
      testnetBalanceMap: {},
      tokenApprovalChain: {},
      useLedgerLive: false,
      highligtedAddresses: [],
      walletSavedList: [],
      watchAddressPreference: {},
    });
    expect(result.contactBook).toEqual({
      '0x10b26700b0a2d3f5ef12fa250aba818ee3b43bf4': {
        address: '0x10b26700b0a2d3f5ef12fa250aba818ee3b43bf4',
        name: 'hongbo',
        isAlias: false,
        isContact: true,
      },
      '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0': {
        address: '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0',
        name: 'test name',
        isAlias: true,
        isContact: true,
      },
      '0x0dbba03df2fb0444081aa5dab355c8a2dcd9075b': {
        address: '0x0dbba03df2fb0444081aa5dab355c8a2dcd9075b',
        name: 'Main Account',
        isAlias: true,
        isContact: false,
      },
    });
  });
});

test('should migrate when no alians', () => {
  const data: { preference: PreferenceStore; contactBook } = {
    preference: {
      firstOpen: false,
      currentVersion: '',
      externalLinkAck: true,
      hiddenAddresses: [],
      isDefaultWallet: true,
      lastTimeSendToken: {
        '0x3c6923d09ec77648ca923ffb4e50251120756faa': {
          amount: 0.07683291,
          chain: 'eth',
          decimals: 18,
          display_symbol: null,
          id: 'eth',
          is_core: true,
          is_verified: true,
          is_wallet: true,
          logo_url:
            'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
          name: 'ETH',
          optimized_symbol: 'ETH',
          price: 2955.33,
          raw_amount: '76832910000000000',
          raw_amount_hex_str: '0x110f71fe39c0c00',
          symbol: 'ETH',
          time_at: 1483200000,
        },
      },
      currentAccount: null,
      initAlianNames: true,
      gasCache: {
        '1': {
          gasLevel: 'slow',
          lastTimeSelect: 'gasLevel',
        },
      },
      addedToken: {},
      alianNames: {},
      balanceMap: {},
      curvePointsMap: {},
      locale: 'en',
      nftApprovalChain: {},
      pinnedChain: [],
      tokenApprovalChain: {},
      useLedgerLive: false,
      highligtedAddresses: [],
      walletSavedList: [],
      watchAddressPreference: {},
      testnetBalanceMap: {},
      addressSortStore: {
        search: '',
        sortType: 'usd',
      },
    },
    contactBook: {
      '0x10b26700b0a2d3f5ef12fa250aba818ee3b43bf4': {
        address: '0x10b26700b0a2d3f5ef12fa250aba818ee3b43bf4',
        name: 'hongbo',
      },
      '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0': {
        address: '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0',
        name: 'test name',
      },
    },
  };
  return contactMigration.migrator(data).then((result) => {
    expect(result!.preference).toEqual({
      firstOpen: false,
      currentVersion: '',
      externalLinkAck: true,
      hiddenAddresses: [],
      isDefaultWallet: true,
      lastTimeSendToken: {
        '0x3c6923d09ec77648ca923ffb4e50251120756faa': {
          amount: 0.07683291,
          chain: 'eth',
          decimals: 18,
          display_symbol: null,
          id: 'eth',
          is_core: true,
          is_verified: true,
          is_wallet: true,
          logo_url:
            'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
          name: 'ETH',
          optimized_symbol: 'ETH',
          price: 2955.33,
          raw_amount: '76832910000000000',
          raw_amount_hex_str: '0x110f71fe39c0c00',
          symbol: 'ETH',
          time_at: 1483200000,
        },
      },
      currentAccount: null,
      initAlianNames: true,
      gasCache: {
        '1': {
          gasLevel: 'slow',
          lastTimeSelect: 'gasLevel',
        },
      },
      addedToken: {},
      addressSortStore: {
        search: '',
        sortType: 'usd',
      },
      balanceMap: {},
      curvePointsMap: {},
      locale: 'en',
      nftApprovalChain: {},
      pinnedChain: [],
      testnetBalanceMap: {},
      tokenApprovalChain: {},
      useLedgerLive: false,
      highligtedAddresses: [],
      walletSavedList: [],
      watchAddressPreference: {},
    });
    expect(result.contactBook).toEqual({
      '0x10b26700b0a2d3f5ef12fa250aba818ee3b43bf4': {
        address: '0x10b26700b0a2d3f5ef12fa250aba818ee3b43bf4',
        name: 'hongbo',
        isAlias: false,
        isContact: true,
      },
      '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0': {
        address: '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0',
        name: 'test name',
        isAlias: false,
        isContact: true,
      },
    });
  });
});

test('should migrate when no contacts', () => {
  const data: { preference: PreferenceStore; contactBook } = {
    preference: {
      firstOpen: false,
      currentVersion: '',
      externalLinkAck: true,
      hiddenAddresses: [],
      isDefaultWallet: true,
      lastTimeSendToken: {
        '0x3c6923d09ec77648ca923ffb4e50251120756faa': {
          amount: 0.07683291,
          chain: 'eth',
          decimals: 18,
          display_symbol: null,
          id: 'eth',
          is_core: true,
          is_verified: true,
          is_wallet: true,
          logo_url:
            'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
          name: 'ETH',
          optimized_symbol: 'ETH',
          price: 2955.33,
          raw_amount: '76832910000000000',
          raw_amount_hex_str: '0x110f71fe39c0c00',
          symbol: 'ETH',
          time_at: 1483200000,
        },
      },
      currentAccount: null,
      initAlianNames: true,
      gasCache: {
        '1': {
          gasLevel: 'slow',
          lastTimeSelect: 'gasLevel',
        },
      },
      addedToken: {},
      alianNames: {
        '0x0dbba03df2fb0444081aa5dab355c8a2dcd9075b': 'Main Account',
        '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0': 'Mnemonic 5',
      },
      balanceMap: {},
      curvePointsMap: {},
      locale: 'en',
      nftApprovalChain: {},
      pinnedChain: [],
      tokenApprovalChain: {},
      useLedgerLive: false,
      highligtedAddresses: [],
      walletSavedList: [],
      watchAddressPreference: {},
      testnetBalanceMap: {},
      addressSortStore: {
        search: '',
        sortType: 'usd',
      },
    },
    contactBook: {},
  };
  return contactMigration.migrator(data).then((result) => {
    expect(result!.preference).toEqual({
      firstOpen: false,
      currentVersion: '',
      externalLinkAck: true,
      hiddenAddresses: [],
      isDefaultWallet: true,
      lastTimeSendToken: {
        '0x3c6923d09ec77648ca923ffb4e50251120756faa': {
          amount: 0.07683291,
          chain: 'eth',
          decimals: 18,
          display_symbol: null,
          id: 'eth',
          is_core: true,
          is_verified: true,
          is_wallet: true,
          logo_url:
            'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
          name: 'ETH',
          optimized_symbol: 'ETH',
          price: 2955.33,
          raw_amount: '76832910000000000',
          raw_amount_hex_str: '0x110f71fe39c0c00',
          symbol: 'ETH',
          time_at: 1483200000,
        },
      },
      currentAccount: null,
      initAlianNames: true,
      gasCache: {
        '1': {
          gasLevel: 'slow',
          lastTimeSelect: 'gasLevel',
        },
      },
      addedToken: {},
      addressSortStore: {
        search: '',
        sortType: 'usd',
      },
      balanceMap: {},
      curvePointsMap: {},
      locale: 'en',
      nftApprovalChain: {},
      pinnedChain: [],
      testnetBalanceMap: {},
      tokenApprovalChain: {},
      useLedgerLive: false,
      highligtedAddresses: [],
      walletSavedList: [],
      watchAddressPreference: {},
    });
    expect(result.contactBook).toEqual({
      '0x0dbba03df2fb0444081aa5dab355c8a2dcd9075b': {
        address: '0x0dbba03df2fb0444081aa5dab355c8a2dcd9075b',
        name: 'Main Account',
        isAlias: true,
        isContact: false,
      },
      '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0': {
        address: '0x111e9e7cdcdc978beed7918eded80c83bd27e9d0',
        name: 'Mnemonic 5',
        isAlias: true,
        isContact: false,
      },
    });
  });
});

test('return undefined for new user', () => {
  contactMigration
    .migrator({ preference: undefined, contactBook: undefined })
    .then((result) => {
      expect(result.contactBook).toBeUndefined();
      expect(result.preference).toBeUndefined();
    });
});
